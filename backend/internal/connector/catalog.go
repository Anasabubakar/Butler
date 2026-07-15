package connector

// ProviderID identifies a first-class Butler connector.
type ProviderID string

const (
	ProviderGoogle  ProviderID = "google"
	ProviderGitHub  ProviderID = "github"
	ProviderSlack   ProviderID = "slack"
	ProviderNotion  ProviderID = "notion"
	ProviderLinear  ProviderID = "linear"
	ProviderFigma   ProviderID = "figma"
	ProviderZapier  ProviderID = "zapier"
	ProviderN8N     ProviderID = "n8n"
)

// Definition describes a connector in the product catalog.
type Definition struct {
	ID       ProviderID
	Name     string
	Role     string
	Scopes   string
	Group    string // google | work | automation
	AuthType string // oauth | client | none
	// OAuth endpoints (empty when AuthType != oauth)
	AuthURL     string
	TokenURL    string
	UserInfoURL string
	DefaultScopes []string
	// Env keys for client credentials
	ClientIDEnv     string
	ClientSecretEnv string
}

// Catalog is the ordered list of Butler integrations.
var Catalog = []Definition{
	{
		ID: ProviderGoogle, Name: "Google Workspace", Role: "mail · calendar · drive · tasks",
		Scopes: "Gmail · Calendar · Drive · Tasks", Group: "google", AuthType: "client",
	},
	{
		ID: ProviderGitHub, Name: "GitHub", Role: "the code",
		Scopes: "Repos, PRs, issues", Group: "work", AuthType: "oauth",
		AuthURL: "https://github.com/login/oauth/authorize",
		TokenURL: "https://github.com/login/oauth/access_token",
		UserInfoURL: "https://api.github.com/user",
		DefaultScopes: []string{"repo", "read:user", "read:org"},
		ClientIDEnv: "GITHUB_CLIENT_ID", ClientSecretEnv: "GITHUB_CLIENT_SECRET",
	},
	{
		ID: ProviderSlack, Name: "Slack", Role: "the room",
		Scopes: "Read + write in your voice", Group: "work", AuthType: "oauth",
		AuthURL: "https://slack.com/oauth/v2/authorize",
		TokenURL: "https://slack.com/api/oauth.v2.access",
		UserInfoURL: "https://slack.com/api/auth.test",
		DefaultScopes: []string{"channels:read", "chat:write", "users:read", "search:read"},
		ClientIDEnv: "SLACK_CLIENT_ID", ClientSecretEnv: "SLACK_CLIENT_SECRET",
	},
	{
		ID: ProviderNotion, Name: "Notion", Role: "the wiki",
		Scopes: "Read + write pages", Group: "work", AuthType: "oauth",
		AuthURL: "https://api.notion.com/v1/oauth/authorize",
		TokenURL: "https://api.notion.com/v1/oauth/token",
		DefaultScopes: []string{},
		ClientIDEnv: "NOTION_CLIENT_ID", ClientSecretEnv: "NOTION_CLIENT_SECRET",
	},
	{
		ID: ProviderLinear, Name: "Linear", Role: "the roadmap",
		Scopes: "Tickets · Comments", Group: "work", AuthType: "oauth",
		AuthURL: "https://linear.app/oauth/authorize",
		TokenURL: "https://api.linear.app/oauth/token",
		DefaultScopes: []string{"read", "write"},
		ClientIDEnv: "LINEAR_CLIENT_ID", ClientSecretEnv: "LINEAR_CLIENT_SECRET",
	},
	{
		ID: ProviderFigma, Name: "Figma", Role: "the design",
		Scopes: "Files · Comments", Group: "work", AuthType: "coming_soon",
	},
	{
		ID: ProviderZapier, Name: "Zapier", Role: "the plumbing",
		Scopes: "Automations", Group: "automation", AuthType: "coming_soon",
	},
	{
		ID: ProviderN8N, Name: "n8n", Role: "self-hosted flows",
		Scopes: "Webhooks · Workflows", Group: "automation", AuthType: "coming_soon",
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
