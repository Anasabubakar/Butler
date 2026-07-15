package connector

// ProviderID identifies a first-class Butler connector.
type ProviderID string

const (
	ProviderGoogle    ProviderID = "google"
	ProviderGitHub    ProviderID = "github"
	ProviderSlack     ProviderID = "slack"
	ProviderNotion    ProviderID = "notion"
	ProviderLinear    ProviderID = "linear"
	ProviderFigma     ProviderID = "figma"
	ProviderDiscord   ProviderID = "discord"
	ProviderMicrosoft ProviderID = "microsoft"
	ProviderDropbox   ProviderID = "dropbox"
	ProviderAsana     ProviderID = "asana"
	ProviderTrello    ProviderID = "trello"
	ProviderZapier    ProviderID = "zapier"
	ProviderN8N       ProviderID = "n8n"
)

// Definition describes a connector in the product catalog.
type Definition struct {
	ID            ProviderID
	Name          string
	Role          string
	Scopes        string
	Group         string // google | work | automation
	AuthType      string // oauth | client | coming_soon
	AuthURL       string
	TokenURL      string
	UserInfoURL   string
	DefaultScopes []string
	ClientIDEnv     string
	ClientSecretEnv string
	// DocsURL is where the operator creates the OAuth app.
	DocsURL string
	// SetupHint is short copy for the Integrations UI when not configured.
	SetupHint string
}

// Catalog is the ordered list of Butler integrations.
var Catalog = []Definition{
	{
		ID: ProviderGoogle, Name: "Google Workspace", Role: "mail · calendar · drive · tasks",
		Scopes: "Gmail · Calendar · Drive · Tasks", Group: "google", AuthType: "client",
		DocsURL:   "https://console.firebase.google.com/",
		SetupHint: "Connect via Google sign-in in Butler (Firebase).",
	},
	{
		ID: ProviderGitHub, Name: "GitHub", Role: "the code",
		Scopes: "Repos, PRs, issues", Group: "work", AuthType: "oauth",
		AuthURL: "https://github.com/login/oauth/authorize",
		TokenURL: "https://github.com/login/oauth/access_token",
		UserInfoURL: "https://api.github.com/user",
		DefaultScopes: []string{"repo", "read:user", "read:org"},
		ClientIDEnv: "GITHUB_CLIENT_ID", ClientSecretEnv: "GITHUB_CLIENT_SECRET",
		DocsURL:   "https://github.com/settings/developers",
		SetupHint: "GitHub → Settings → Developer settings → OAuth Apps → New OAuth App",
	},
	{
		ID: ProviderSlack, Name: "Slack", Role: "the room",
		Scopes: "Read + write in your voice", Group: "work", AuthType: "oauth",
		AuthURL: "https://slack.com/oauth/v2/authorize",
		TokenURL: "https://slack.com/api/oauth.v2.access",
		UserInfoURL: "https://slack.com/api/auth.test",
		DefaultScopes: []string{"channels:read", "chat:write", "users:read", "search:read"},
		ClientIDEnv: "SLACK_CLIENT_ID", ClientSecretEnv: "SLACK_CLIENT_SECRET",
		DocsURL:   "https://api.slack.com/apps",
		SetupHint: "api.slack.com/apps → Create New App → OAuth & Permissions",
	},
	{
		ID: ProviderNotion, Name: "Notion", Role: "the wiki",
		Scopes: "Read + write pages", Group: "work", AuthType: "oauth",
		AuthURL: "https://api.notion.com/v1/oauth/authorize",
		TokenURL: "https://api.notion.com/v1/oauth/token",
		DefaultScopes: []string{},
		ClientIDEnv: "NOTION_CLIENT_ID", ClientSecretEnv: "NOTION_CLIENT_SECRET",
		DocsURL:   "https://www.notion.so/my-integrations",
		SetupHint: "Notion → My integrations → New integration → Public (OAuth)",
	},
	{
		ID: ProviderLinear, Name: "Linear", Role: "the roadmap",
		Scopes: "Tickets · Comments", Group: "work", AuthType: "oauth",
		AuthURL: "https://linear.app/oauth/authorize",
		TokenURL: "https://api.linear.app/oauth/token",
		DefaultScopes: []string{"read", "write"},
		ClientIDEnv: "LINEAR_CLIENT_ID", ClientSecretEnv: "LINEAR_CLIENT_SECRET",
		DocsURL:   "https://linear.app/settings/api/applications/new",
		SetupHint: "Linear → Settings → API → OAuth applications",
	},
	{
		ID: ProviderFigma, Name: "Figma", Role: "the design",
		Scopes: "Files · Comments", Group: "work", AuthType: "oauth",
		AuthURL: "https://www.figma.com/oauth",
		TokenURL: "https://api.figma.com/v1/oauth/token",
		UserInfoURL: "https://api.figma.com/v1/me",
		DefaultScopes: []string{"file_read"},
		ClientIDEnv: "FIGMA_CLIENT_ID", ClientSecretEnv: "FIGMA_CLIENT_SECRET",
		DocsURL:   "https://www.figma.com/developers/apps",
		SetupHint: "Figma → Settings → Apps → Create a new app",
	},
	{
		ID: ProviderDiscord, Name: "Discord", Role: "the community",
		Scopes: "Identify · Guilds", Group: "work", AuthType: "oauth",
		AuthURL: "https://discord.com/api/oauth2/authorize",
		TokenURL: "https://discord.com/api/oauth2/token",
		UserInfoURL: "https://discord.com/api/users/@me",
		DefaultScopes: []string{"identify", "guilds"},
		ClientIDEnv: "DISCORD_CLIENT_ID", ClientSecretEnv: "DISCORD_CLIENT_SECRET",
		DocsURL:   "https://discord.com/developers/applications",
		SetupHint: "Discord Developer Portal → New Application → OAuth2",
	},
	{
		ID: ProviderMicrosoft, Name: "Microsoft 365", Role: "mail · calendar · files",
		Scopes: "Mail · Calendar · Files", Group: "work", AuthType: "oauth",
		AuthURL: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
		TokenURL: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
		UserInfoURL: "https://graph.microsoft.com/v1.0/me",
		DefaultScopes: []string{"offline_access", "User.Read", "Mail.ReadWrite", "Calendars.ReadWrite", "Files.ReadWrite"},
		ClientIDEnv: "MICROSOFT_CLIENT_ID", ClientSecretEnv: "MICROSOFT_CLIENT_SECRET",
		DocsURL:   "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps",
		SetupHint: "Azure Portal → App registrations → New registration",
	},
	{
		ID: ProviderDropbox, Name: "Dropbox", Role: "the files",
		Scopes: "Files · Metadata", Group: "work", AuthType: "oauth",
		AuthURL: "https://www.dropbox.com/oauth2/authorize",
		TokenURL: "https://api.dropboxapi.com/oauth2/token",
		DefaultScopes: []string{},
		ClientIDEnv: "DROPBOX_CLIENT_ID", ClientSecretEnv: "DROPBOX_CLIENT_SECRET",
		DocsURL:   "https://www.dropbox.com/developers/apps",
		SetupHint: "Dropbox App Console → Create app",
	},
	{
		ID: ProviderAsana, Name: "Asana", Role: "the projects",
		Scopes: "Tasks · Projects", Group: "work", AuthType: "oauth",
		AuthURL: "https://app.asana.com/-/oauth_authorize",
		TokenURL: "https://app.asana.com/-/oauth_token",
		UserInfoURL: "https://app.asana.com/api/1.0/users/me",
		DefaultScopes: []string{"default"},
		ClientIDEnv: "ASANA_CLIENT_ID", ClientSecretEnv: "ASANA_CLIENT_SECRET",
		DocsURL:   "https://app.asana.com/0/my-apps",
		SetupHint: "Asana → My apps → Create new app",
	},
	{
		ID: ProviderTrello, Name: "Trello", Role: "the boards",
		Scopes: "Read · Write", Group: "work", AuthType: "oauth",
		// Trello uses 1.0a OAuth differently; we use their authorize + token via 1.0-style web flow token URL.
		AuthURL: "https://trello.com/1/authorize",
		TokenURL: "https://trello.com/1/OAuthGetAccessToken",
		DefaultScopes: []string{"read", "write"},
		ClientIDEnv: "TRELLO_API_KEY", ClientSecretEnv: "TRELLO_API_SECRET",
		DocsURL:   "https://trello.com/power-ups/admin",
		SetupHint: "Trello Power-Ups admin → New → API key (OAuth 1.0a is limited; see docs)",
	},
	{
		ID: ProviderZapier, Name: "Zapier", Role: "the plumbing",
		Scopes: "Automations", Group: "automation", AuthType: "coming_soon",
		SetupHint: "Webhook-based Zapier connect is next.",
	},
	{
		ID: ProviderN8N, Name: "n8n", Role: "self-hosted flows",
		Scopes: "Webhooks · Workflows", Group: "automation", AuthType: "coming_soon",
		SetupHint: "Webhook-based n8n connect is next.",
	},
}

// ByID returns a catalog definition or nil.
func ByID(id string) *Definition {
	for i := range Catalog {
		if string(Catalog[i].ID) == id {
			return &Catalog[i]
		}
	}
	return nil
}
