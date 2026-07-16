package connector

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// OAuthConfig holds runtime credentials for a provider.
type OAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	Configured   bool
}

// LoadOAuthConfig reads client credentials from the environment for a definition.
func LoadOAuthConfig(def Definition, publicAPIBase string) OAuthConfig {
	id := strings.TrimSpace(os.Getenv(def.ClientIDEnv))
	secret := strings.TrimSpace(os.Getenv(def.ClientSecretEnv))
	redirect := strings.TrimSpace(os.Getenv("OAUTH_REDIRECT_BASE"))
	if redirect == "" {
		redirect = strings.TrimRight(publicAPIBase, "/")
	}
	return OAuthConfig{
		ClientID:     id,
		ClientSecret: secret,
		RedirectURI:  fmt.Sprintf("%s/api/integrations/callback/%s", strings.TrimRight(redirect, "/"), def.ID),
		Configured:   id != "" && secret != "" && def.AuthType == "oauth",
	}
}

// BuildAuthURL constructs the provider authorize URL.
func BuildAuthURL(def Definition, cfg OAuthConfig, state string) string {
	u, err := url.Parse(def.AuthURL)
	if err != nil {
		return ""
	}
	q := u.Query()
	q.Set("client_id", cfg.ClientID)
	q.Set("redirect_uri", cfg.RedirectURI)
	q.Set("state", state)
	q.Set("response_type", "code")

	switch def.ID {
	case ProviderGitHub:
		if len(def.DefaultScopes) > 0 {
			q.Set("scope", strings.Join(def.DefaultScopes, " "))
		}
	case ProviderSlack:
		if len(def.DefaultScopes) > 0 {
			q.Set("scope", strings.Join(def.DefaultScopes, ","))
		}
		if len(def.UserScopes) > 0 {
			q.Set("user_scope", strings.Join(def.UserScopes, ","))
		}
	case ProviderNotion:
		q.Set("owner", "user")
	case ProviderLinear:
		if len(def.DefaultScopes) > 0 {
			// Linear accepts space-separated scopes in some clients; comma is also accepted.
			q.Set("scope", strings.Join(def.DefaultScopes, ","))
		}
		q.Set("prompt", "consent")
		q.Set("actor", "app")
	case ProviderFigma:
		if len(def.DefaultScopes) > 0 {
			q.Set("scope", strings.Join(def.DefaultScopes, " "))
		}
	case ProviderDiscord:
		if len(def.DefaultScopes) > 0 {
			q.Set("scope", strings.Join(def.DefaultScopes, " "))
		}
	case ProviderAsana:
		// Asana uses default scopes on the app
	case ProviderTrello:
		// Trello 1.0 authorize uses different params
		q.Del("response_type")
		q.Set("expiration", "never")
		q.Set("name", "Butler")
		q.Set("scope", strings.Join(def.DefaultScopes, ","))
		q.Set("response_type", "token") // fragment token flow — limited; prefer API key apps
		q.Set("key", cfg.ClientID)
		q.Set("return_url", cfg.RedirectURI)
		q.Del("client_id")
		q.Del("redirect_uri")
	default:
		if len(def.DefaultScopes) > 0 {
			q.Set("scope", strings.Join(def.DefaultScopes, " "))
		}
	}

	u.RawQuery = q.Encode()
	return u.String()
}

// TokenResult is the normalized token exchange response.
type TokenResult struct {
	AccessToken  string
	RefreshToken string
	TokenType    string
	ExpiresIn    int
	Scope        string
	AccountID    string
	AccountLabel string
	Raw          map[string]any
}

// ExchangeCode trades an authorization code for tokens.
func ExchangeCode(ctx context.Context, def Definition, cfg OAuthConfig, code string) (*TokenResult, error) {
	switch def.ID {
	case ProviderNotion:
		return exchangeNotion(ctx, def, cfg, code)
	case ProviderSlack:
		return exchangeSlack(ctx, def, cfg, code)
	case ProviderFigma:
		return exchangeFigma(ctx, def, cfg, code)
	case ProviderDiscord:
		return exchangeForm(ctx, def, cfg, code)
	case ProviderAsana:
		return exchangeForm(ctx, def, cfg, code)
	case ProviderTrello:
		// Trello token may be returned as fragment; if we receive a code-like token, store it.
		return &TokenResult{AccessToken: code, TokenType: "Bearer", AccountLabel: "Trello"}, nil
	default:
		return exchangeForm(ctx, def, cfg, code)
	}
}

func exchangeFigma(ctx context.Context, def Definition, cfg OAuthConfig, code string) (*TokenResult, error) {
	form := url.Values{}
	form.Set("client_id", cfg.ClientID)
	form.Set("client_secret", cfg.ClientSecret)
	form.Set("redirect_uri", cfg.RedirectURI)
	form.Set("code", code)
	form.Set("grant_type", "authorization_code")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, def.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("figma token exchange failed: %s", string(body))
	}
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	tr := &TokenResult{
		AccessToken:  str(raw["access_token"]),
		RefreshToken: str(raw["refresh_token"]),
		TokenType:    str(raw["token_type"]),
		Raw:          raw,
	}
	if v, ok := raw["expires_in"].(float64); ok {
		tr.ExpiresIn = int(v)
	}
	if def.UserInfoURL != "" && tr.AccessToken != "" {
		label, id, _ := fetchUserLabel(ctx, def, tr.AccessToken)
		tr.AccountLabel = label
		tr.AccountID = id
	}
	return tr, nil
}

func exchangeForm(ctx context.Context, def Definition, cfg OAuthConfig, code string) (*TokenResult, error) {
	form := url.Values{}
	form.Set("client_id", cfg.ClientID)
	form.Set("client_secret", cfg.ClientSecret)
	form.Set("code", code)
	form.Set("redirect_uri", cfg.RedirectURI)
	form.Set("grant_type", "authorization_code")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, def.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("%s token exchange failed: %s", def.ID, string(body))
	}

	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		// GitHub may return form-encoded if Accept not honored
		vals, err2 := url.ParseQuery(string(body))
		if err2 != nil {
			return nil, err
		}
		raw = map[string]any{}
		for k, v := range vals {
			if len(v) > 0 {
				raw[k] = v[0]
			}
		}
	}

	tr := &TokenResult{
		AccessToken:  str(raw["access_token"]),
		RefreshToken: str(raw["refresh_token"]),
		TokenType:    str(raw["token_type"]),
		Scope:        str(raw["scope"]),
		Raw:          raw,
	}
	if tr.TokenType == "" {
		tr.TokenType = "Bearer"
	}
	if v, ok := raw["expires_in"].(float64); ok {
		tr.ExpiresIn = int(v)
	}

	if def.UserInfoURL != "" && tr.AccessToken != "" {
		label, id, _ := fetchUserLabel(ctx, def, tr.AccessToken)
		tr.AccountLabel = label
		tr.AccountID = id
	}
	return tr, nil
}

func exchangeNotion(ctx context.Context, def Definition, cfg OAuthConfig, code string) (*TokenResult, error) {
	payload := map[string]string{
		"grant_type":   "authorization_code",
		"code":         code,
		"redirect_uri": cfg.RedirectURI,
	}
	b, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, def.TokenURL, strings.NewReader(string(b)))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(cfg.ClientID, cfg.ClientSecret)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Notion-Version", "2022-06-28")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("notion token exchange failed: %s", string(body))
	}
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	tr := &TokenResult{
		AccessToken:  str(raw["access_token"]),
		RefreshToken: str(raw["refresh_token"]),
		TokenType:    str(raw["token_type"]),
		Raw:          raw,
	}
	if owner, ok := raw["owner"].(map[string]any); ok {
		if user, ok := owner["user"].(map[string]any); ok {
			tr.AccountLabel = str(user["name"])
			tr.AccountID = str(user["id"])
		}
	}
	if tr.AccountLabel == "" {
		tr.AccountLabel = str(raw["workspace_name"])
	}
	return tr, nil
}

func exchangeSlack(ctx context.Context, def Definition, cfg OAuthConfig, code string) (*TokenResult, error) {
	form := url.Values{}
	form.Set("client_id", cfg.ClientID)
	form.Set("client_secret", cfg.ClientSecret)
	form.Set("code", code)
	form.Set("redirect_uri", cfg.RedirectURI)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, def.TokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	if ok, _ := raw["ok"].(bool); !ok {
		return nil, fmt.Errorf("slack oauth error: %v", raw["error"])
	}
	tr := &TokenResult{
		AccessToken: str(raw["access_token"]),
		TokenType:   str(raw["token_type"]),
		Raw:         raw,
	}
	if team, ok := raw["team"].(map[string]any); ok {
		tr.AccountLabel = str(team["name"])
		tr.AccountID = str(team["id"])
	}
	if tr.AccessToken == "" {
		if authed, ok := raw["authed_user"].(map[string]any); ok {
			tr.AccessToken = str(authed["access_token"])
		}
	}
	return tr, nil
}

func fetchUserLabel(ctx context.Context, def Definition, accessToken string) (label, id string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, def.UserInfoURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")
	if def.ID == ProviderGitHub {
		req.Header.Set("User-Agent", "Butler-AI-OS")
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var raw map[string]any
	if err := json.Unmarshal(body, &raw); err != nil {
		return "", "", err
	}
	switch def.ID {
	case ProviderGitHub:
		return firstNonEmpty(str(raw["login"]), str(raw["name"])), fmt.Sprintf("%v", raw["id"]), nil
	case ProviderSlack:
		return str(raw["user"]), str(raw["user_id"]), nil
	case ProviderDiscord:
		return firstNonEmpty(str(raw["global_name"]), str(raw["username"])), str(raw["id"]), nil
	case ProviderFigma:
		return firstNonEmpty(str(raw["handle"]), str(raw["email"])), str(raw["id"]), nil
	case ProviderAsana:
		if data, ok := raw["data"].(map[string]any); ok {
			return str(data["name"]), str(data["gid"]), nil
		}
		return str(raw["name"]), str(raw["gid"]), nil
	default:
		return str(raw["name"]), str(raw["id"]), nil
	}
}

func str(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return fmt.Sprintf("%.0f", t)
	default:
		if v == nil {
			return ""
		}
		return fmt.Sprint(v)
	}
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
