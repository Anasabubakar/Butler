package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gamp/butler/internal/connector"
	"github.com/gamp/butler/internal/crypto"
	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
	"github.com/google/uuid"
)

// IntegrationsService is the connector SDK facade.
type IntegrationsService struct {
	repo       repository.ConnectionsRepository
	vault      *crypto.TokenVault
	publicAPI  string
	appBaseURL string
}

// NewIntegrationsService constructs the service.
func NewIntegrationsService(
	repo repository.ConnectionsRepository,
	vault *crypto.TokenVault,
	publicAPI string,
	appBaseURL string,
) *IntegrationsService {
	return &IntegrationsService{
		repo:       repo,
		vault:      vault,
		publicAPI:  publicAPI,
		appBaseURL: appBaseURL,
	}
}

// ListCatalog returns catalog items with connection status for a user.
func (s *IntegrationsService) ListCatalog(ctx context.Context, userID string) ([]model.IntegrationCatalogItem, error) {
	conns, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		// Table may not exist yet during rollout — surface empty connections.
		conns = nil
	}
	byProvider := map[string]*model.OAuthConnection{}
	for _, c := range conns {
		byProvider[c.Provider] = c
	}

	items := make([]model.IntegrationCatalogItem, 0, len(connector.Catalog))
	for _, def := range connector.Catalog {
		item := model.IntegrationCatalogItem{
			ID:     string(def.ID),
			Name:   def.Name,
			Role:   def.Role,
			Scopes: def.Scopes,
			Group:  def.Group,
			AuthType: def.AuthType,
		}

		if def.AuthType == "coming_soon" {
			item.Status = "coming_soon"
			item.Configured = false
			items = append(items, item)
			continue
		}

		if def.AuthType == "oauth" {
			cfg := connector.LoadOAuthConfig(def, s.publicAPI)
			item.Configured = cfg.Configured
			if !cfg.Configured {
				item.Status = "not_configured"
			} else {
				item.Status = "available"
			}
		} else if def.AuthType == "client" {
			item.Configured = true
			item.Status = "available"
		}

		if c, ok := byProvider[string(def.ID)]; ok && c.Status == "connected" {
			item.Status = "connected"
			item.AccountLabel = c.AccountLabel
			if !c.CreatedAt.IsZero() {
				t := c.CreatedAt.UTC().Format(time.RFC3339)
				item.ConnectedAt = &t
			}
			if c.LastSyncedAt != nil {
				t := c.LastSyncedAt.UTC().Format(time.RFC3339)
				item.LastSyncedAt = &t
			}
		}

		items = append(items, item)
	}
	return items, nil
}

// StartConnect begins an OAuth or client connect flow.
func (s *IntegrationsService) StartConnect(ctx context.Context, userID, provider, redirectTo string) (*model.ConnectResponse, error) {
	def := connector.ByID(provider)
	if def == nil {
		return nil, fmt.Errorf("unknown provider")
	}
	if def.AuthType == "coming_soon" {
		return &model.ConnectResponse{
			Provider: provider,
			Mode:     "disabled",
			Message:  def.Name + " is on the roadmap — not available yet.",
		}, nil
	}
	if def.AuthType == "client" {
		return &model.ConnectResponse{
			Provider: provider,
			Mode:     "client",
			Message:  "Complete Google sign-in in the app, then register the Workspace token.",
		}, nil
	}

	cfg := connector.LoadOAuthConfig(*def, s.publicAPI)
	if !cfg.Configured {
		return &model.ConnectResponse{
			Provider: provider,
			Mode:     "disabled",
			Message:  def.Name + " OAuth is not configured on this server. Set " + def.ClientIDEnv + " and " + def.ClientSecretEnv + ".",
		}, nil
	}

	state, err := randomState()
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if redirectTo == "" {
		redirectTo = strings.TrimRight(s.appBaseURL, "/") + "/dashboard/integrations"
	}
	if err := s.repo.SaveState(ctx, &model.OAuthState{
		State:      state,
		UserID:     userID,
		Provider:   provider,
		RedirectTo: redirectTo,
		CreatedAt:  now,
		ExpiresAt:  now.Add(10 * time.Minute),
	}); err != nil {
		return nil, fmt.Errorf("save oauth state: %w", err)
	}
	_ = s.repo.DeleteExpiredStates(ctx)

	return &model.ConnectResponse{
		Provider: provider,
		Mode:     "redirect",
		AuthURL:  connector.BuildAuthURL(*def, cfg, state),
	}, nil
}

// CompleteOAuth finishes the callback exchange and vaults tokens.
func (s *IntegrationsService) CompleteOAuth(ctx context.Context, provider, code, state string) (redirectTo string, err error) {
	st, err := s.repo.ConsumeState(ctx, state)
	if err != nil {
		return s.appBaseURL + "/dashboard/integrations?error=invalid_state", fmt.Errorf("invalid state")
	}
	if st.Provider != provider {
		return st.RedirectTo + "?error=provider_mismatch", fmt.Errorf("provider mismatch")
	}

	def := connector.ByID(provider)
	if def == nil {
		return st.RedirectTo + "?error=unknown_provider", fmt.Errorf("unknown provider")
	}
	cfg := connector.LoadOAuthConfig(*def, s.publicAPI)
	tokens, err := connector.ExchangeCode(ctx, *def, cfg, code)
	if err != nil {
		return st.RedirectTo + "?error=token_exchange", err
	}

	accessEnc, err := s.vault.Seal(tokens.AccessToken)
	if err != nil {
		return st.RedirectTo + "?error=vault", err
	}
	refreshEnc, err := s.vault.Seal(tokens.RefreshToken)
	if err != nil {
		return st.RedirectTo + "?error=vault", err
	}

	now := time.Now().UTC()
	var exp *time.Time
	if tokens.ExpiresIn > 0 {
		t := now.Add(time.Duration(tokens.ExpiresIn) * time.Second)
		exp = &t
	}
	meta, _ := json.Marshal(map[string]any{"scope": tokens.Scope})
	scopes := tokens.Scope
	if scopes == "" {
		scopes = strings.Join(def.DefaultScopes, " ")
	}
	label := tokens.AccountLabel
	if label == "" {
		label = def.Name
	}

	// Keep existing row id if present
	id := uuid.New().String()
	if existing, err := s.repo.GetByUserAndProvider(ctx, st.UserID, provider); err == nil && existing != nil {
		id = existing.ID
	}

	conn := &model.OAuthConnection{
		ID:              id,
		UserID:          st.UserID,
		Provider:        provider,
		AccountLabel:    label,
		AccountID:       tokens.AccountID,
		Scopes:          scopes,
		AccessTokenEnc:  accessEnc,
		RefreshTokenEnc: refreshEnc,
		TokenType:       tokens.TokenType,
		ExpiresAt:       exp,
		Metadata:        meta,
		Status:          "connected",
		LastSyncedAt:    &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.repo.Upsert(ctx, conn); err != nil {
		return st.RedirectTo + "?error=persist", err
	}

	sep := "?"
	if strings.Contains(st.RedirectTo, "?") {
		sep = "&"
	}
	return st.RedirectTo + sep + "connected=" + provider, nil
}

// RegisterGoogle vaults a Google Workspace access token from the Firebase client flow.
func (s *IntegrationsService) RegisterGoogle(ctx context.Context, userID string, req model.RegisterGoogleRequest) (*model.OAuthConnection, error) {
	if strings.TrimSpace(req.AccessToken) == "" {
		return nil, fmt.Errorf("accessToken is required")
	}
	accessEnc, err := s.vault.Seal(req.AccessToken)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	id := uuid.New().String()
	if existing, err := s.repo.GetByUserAndProvider(ctx, userID, string(connector.ProviderGoogle)); err == nil && existing != nil {
		id = existing.ID
	}
	scopes := req.Scopes
	if scopes == "" {
		scopes = "gmail calendar drive tasks contacts"
	}
	label := req.Email
	if label == "" {
		label = "Google Workspace"
	}
	conn := &model.OAuthConnection{
		ID:             id,
		UserID:         userID,
		Provider:       string(connector.ProviderGoogle),
		AccountLabel:   label,
		Scopes:         scopes,
		AccessTokenEnc: accessEnc,
		TokenType:      "Bearer",
		Status:         "connected",
		LastSyncedAt:   &now,
		CreatedAt:      now,
		UpdatedAt:      now,
		Metadata:       []byte(`{"source":"firebase_popup"}`),
	}
	if err := s.repo.Upsert(ctx, conn); err != nil {
		return nil, err
	}
	// Do not return sealed tokens in response.
	conn.AccessTokenEnc = ""
	conn.RefreshTokenEnc = ""
	return conn, nil
}

// Disconnect removes a stored connection.
func (s *IntegrationsService) Disconnect(ctx context.Context, userID, provider string) error {
	if connector.ByID(provider) == nil {
		return fmt.Errorf("unknown provider")
	}
	return s.repo.Delete(ctx, userID, provider)
}

// GetAccessToken decrypts a stored token for server-side API calls.
func (s *IntegrationsService) GetAccessToken(ctx context.Context, userID, provider string) (string, error) {
	c, err := s.repo.GetByUserAndProvider(ctx, userID, provider)
	if err != nil {
		return "", err
	}
	return s.vault.Open(c.AccessTokenEnc)
}

// FrontendIntegrationsURL is the post-OAuth landing page.
func (s *IntegrationsService) FrontendIntegrationsURL() string {
	return strings.TrimRight(s.appBaseURL, "/") + "/dashboard/integrations"
}

func randomState() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
