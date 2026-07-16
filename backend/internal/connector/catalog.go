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
	ID              ProviderID
	Name            string
	Role            string
	Scopes          string
	Group           string // google | work | automation
	AuthType        string // oauth | client | coming_soon
	AuthURL         string
	TokenURL        string
	UserInfoURL     string
	DefaultScopes   []string
	// UserScopes are Slack-style user_scope grants (optional).
	UserScopes      []string
	ClientIDEnv     string
	ClientSecretEnv string
	DocsURL         string
	SetupHint       string
}

// Catalog is the ordered list of Butler integrations.
// DefaultScopes intentionally request the widest practical OAuth surface for each provider.
// The OAuth app in that provider's console must also have those permissions enabled.
var Catalog = []Definition{
	{
		ID: ProviderGoogle, Name: "Google Workspace", Role: "mail · calendar · drive · tasks · contacts",
		Scopes: "Full Workspace access via Firebase Google scopes", Group: "google", AuthType: "client",
		DocsURL:   "https://console.firebase.google.com/",
		SetupHint: "Connect via Google sign-in in Butler (Firebase).",
	},
	{
		ID: ProviderGitHub, Name: "GitHub", Role: "the code",
		Scopes: "Full repo, org, workflow, packages, projects access", Group: "work", AuthType: "oauth",
		AuthURL: "https://github.com/login/oauth/authorize",
		TokenURL: "https://github.com/login/oauth/access_token",
		UserInfoURL: "https://api.github.com/user",
		DefaultScopes: []string{
			"repo", "workflow", "write:packages", "delete:packages",
			"admin:org", "admin:public_key", "admin:repo_hook", "admin:org_hook",
			"gist", "notifications", "user", "delete_repo",
			"write:discussion", "project", "admin:gpg_key", "admin:ssh_signing_key",
		},
		ClientIDEnv: "GITHUB_CLIENT_ID", ClientSecretEnv: "GITHUB_CLIENT_SECRET",
		DocsURL:   "https://github.com/settings/developers",
		SetupHint: "GitHub → Settings → Developer settings → OAuth Apps → enable all scopes",
	},
	{
		ID: ProviderSlack, Name: "Slack", Role: "the room",
		Scopes: "Full bot + user workspace access", Group: "work", AuthType: "oauth",
		AuthURL: "https://slack.com/oauth/v2/authorize",
		TokenURL: "https://slack.com/api/oauth.v2.access",
		UserInfoURL: "https://slack.com/api/auth.test",
		// Bot token scopes — must also be added under OAuth & Permissions in the Slack app.
		DefaultScopes: []string{
			"app_mentions:read", "bookmarks:read", "bookmarks:write",
			"calls:read", "calls:write", "canvases:read", "canvases:write",
			"channels:history", "channels:join", "channels:manage", "channels:read", "channels:write.invites",
			"chat:write", "chat:write.customize", "chat:write.public",
			"commands", "dnd:read", "dnd:write", "emoji:read",
			"files:read", "files:write",
			"groups:history", "groups:read", "groups:write", "groups:write.invites",
			"im:history", "im:read", "im:write", "im:write.topic",
			"links:read", "links:write",
			"mpim:history", "mpim:read", "mpim:write", "mpim:write.topic",
			"pins:read", "pins:write",
			"reactions:read", "reactions:write",
			"reminders:read", "reminders:write",
			"remote_files:read", "remote_files:share", "remote_files:write",
			"search:read",
			"stars:read", "stars:write",
			"team:read",
			"usergroups:read", "usergroups:write",
			"users:read", "users:read.email", "users:write",
			"users.profile:read", "users.profile:write",
			"workflow.steps:execute",
		},
		// User token scopes (user_scope query param).
		UserScopes: []string{
			"channels:history", "channels:read", "channels:write",
			"chat:write", "emoji:read", "files:read", "files:write",
			"groups:history", "groups:read", "groups:write",
			"im:history", "im:read", "im:write",
			"mpim:history", "mpim:read", "mpim:write",
			"pins:read", "pins:write",
			"reactions:read", "reactions:write",
			"search:read", "stars:read", "stars:write",
			"team:read", "users:read", "users:read.email", "users.profile:read", "users.profile:write",
		},
		ClientIDEnv: "SLACK_CLIENT_ID", ClientSecretEnv: "SLACK_CLIENT_SECRET",
		DocsURL:   "https://api.slack.com/apps",
		SetupHint: "Slack app → OAuth & Permissions → enable bot + user scopes to match Butler",
	},
	{
		ID: ProviderNotion, Name: "Notion", Role: "the wiki",
		Scopes: "Full workspace content (capabilities set on the Notion integration)", Group: "work", AuthType: "oauth",
		AuthURL: "https://api.notion.com/v1/oauth/authorize",
		TokenURL: "https://api.notion.com/v1/oauth/token",
		// Notion capabilities are configured on the integration (Read/Update/Insert content, comments, user info).
		DefaultScopes: []string{},
		ClientIDEnv: "NOTION_CLIENT_ID", ClientSecretEnv: "NOTION_CLIENT_SECRET",
		DocsURL:   "https://www.notion.so/my-integrations",
		SetupHint: "Notion integration → Capabilities: enable all content + comment + user capabilities",
	},
	{
		ID: ProviderLinear, Name: "Linear", Role: "the roadmap",
		Scopes: "Full Linear workspace (read, write, admin, create)", Group: "work", AuthType: "oauth",
		AuthURL: "https://linear.app/oauth/authorize",
		TokenURL: "https://api.linear.app/oauth/token",
		DefaultScopes: []string{
			"read", "write", "issues:create", "comments:create", "timeSchedule:write", "admin",
		},
		ClientIDEnv: "LINEAR_CLIENT_ID", ClientSecretEnv: "LINEAR_CLIENT_SECRET",
		DocsURL:   "https://linear.app/settings/api/applications/new",
		SetupHint: "Linear OAuth app → enable all scopes; webhook → backend /api/webhooks/linear",
	},
	{
		ID: ProviderFigma, Name: "Figma", Role: "the design",
		Scopes: "Full Figma files, comments, variables, webhooks", Group: "work", AuthType: "oauth",
		AuthURL: "https://www.figma.com/oauth",
		TokenURL: "https://api.figma.com/v1/oauth/token",
		UserInfoURL: "https://api.figma.com/v1/me",
		DefaultScopes: []string{
			"current_user:read",
			"file_content:read", "file_metadata:read", "file_versions:read",
			"file_comments:read", "file_comments:write",
			"file_dev_resources:read", "file_dev_resources:write",
			"file_variables:read", "file_variables:write",
			"library_content:read", "library_assets:read",
			"webhooks:write", "projects:read", "team_library_content:read",
		},
		ClientIDEnv: "FIGMA_CLIENT_ID", ClientSecretEnv: "FIGMA_CLIENT_SECRET",
		DocsURL:   "https://www.figma.com/developers/apps",
		SetupHint: "Figma app → enable every available OAuth scope",
	},
	{
		ID: ProviderDiscord, Name: "Discord", Role: "the community",
		Scopes: "Full user + guild + messaging surface", Group: "work", AuthType: "oauth",
		AuthURL: "https://discord.com/api/oauth2/authorize",
		TokenURL: "https://discord.com/api/oauth2/token",
		UserInfoURL: "https://discord.com/api/users/@me",
		DefaultScopes: []string{
			"identify", "email", "connections", "guilds", "guilds.join", "guilds.members.read",
			"gdm.join", "messages.read", "role_connections.write",
			"applications.commands", "applications.commands.permissions.update",
			"bot", "rpc", "rpc.notifications.read", "webhook.incoming",
		},
		ClientIDEnv: "DISCORD_CLIENT_ID", ClientSecretEnv: "DISCORD_CLIENT_SECRET",
		DocsURL:   "https://discord.com/developers/applications",
		SetupHint: "Discord OAuth2 → enable all scopes you want Butler to request",
	},
	{
		ID: ProviderMicrosoft, Name: "Microsoft 365", Role: "mail · calendar · files · chat",
		Scopes: "Broad Microsoft Graph delegated access", Group: "work", AuthType: "oauth",
		AuthURL: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
		TokenURL: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
		UserInfoURL: "https://graph.microsoft.com/v1.0/me",
		DefaultScopes: []string{
			"offline_access", "openid", "profile", "email",
			"User.Read", "User.ReadWrite", "User.ReadBasic.All", "User.Read.All",
			"Mail.Read", "Mail.ReadWrite", "Mail.Send", "Mail.Read.Shared", "Mail.ReadWrite.Shared",
			"Calendars.Read", "Calendars.ReadWrite", "Calendars.Read.Shared", "Calendars.ReadWrite.Shared",
			"Contacts.Read", "Contacts.ReadWrite",
			"Files.Read", "Files.ReadWrite", "Files.Read.All", "Files.ReadWrite.All", "Sites.Read.All", "Sites.ReadWrite.All",
			"Notes.Read", "Notes.ReadWrite",
			"Tasks.Read", "Tasks.ReadWrite",
			"Chat.Read", "Chat.ReadWrite", "ChannelMessage.Read.All", "ChannelMessage.Send",
			"Team.ReadBasic.All", "Channel.ReadBasic.All",
			"OnlineMeetings.Read", "OnlineMeetings.ReadWrite",
			"Presence.Read", "Presence.Read.All",
		},
		ClientIDEnv: "MICROSOFT_CLIENT_ID", ClientSecretEnv: "MICROSOFT_CLIENT_SECRET",
		DocsURL:   "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps",
		SetupHint: "Azure App registration → API permissions → add all Graph delegated permissions above",
	},
	{
		ID: ProviderDropbox, Name: "Dropbox", Role: "the files",
		Scopes: "Full Dropbox account file access", Group: "work", AuthType: "oauth",
		AuthURL: "https://www.dropbox.com/oauth2/authorize",
		TokenURL: "https://api.dropboxapi.com/oauth2/token",
		DefaultScopes: []string{
			"account_info.read", "account_info.write",
			"files.metadata.read", "files.metadata.write",
			"files.content.read", "files.content.write",
			"files.permanent_delete",
			"sharing.read", "sharing.write",
			"file_requests.read", "file_requests.write",
			"contacts.read", "contacts.write",
		},
		ClientIDEnv: "DROPBOX_CLIENT_ID", ClientSecretEnv: "DROPBOX_CLIENT_SECRET",
		DocsURL:   "https://www.dropbox.com/developers/apps",
		SetupHint: "Dropbox app → Permissions tab → enable all scopes Butler requests",
	},
	{
		ID: ProviderAsana, Name: "Asana", Role: "the projects",
		Scopes: "Full Asana default app capabilities", Group: "work", AuthType: "oauth",
		AuthURL: "https://app.asana.com/-/oauth_authorize",
		TokenURL: "https://app.asana.com/-/oauth_token",
		UserInfoURL: "https://app.asana.com/api/1.0/users/me",
		DefaultScopes: []string{"default"},
		ClientIDEnv: "ASANA_CLIENT_ID", ClientSecretEnv: "ASANA_CLIENT_SECRET",
		DocsURL:   "https://app.asana.com/0/my-apps",
		SetupHint: "Asana app → enable every permission available to the app",
	},
	{
		ID: ProviderTrello, Name: "Trello", Role: "the boards",
		Scopes: "Read · Write · Account", Group: "work", AuthType: "oauth",
		AuthURL: "https://trello.com/1/authorize",
		TokenURL: "https://trello.com/1/OAuthGetAccessToken",
		DefaultScopes: []string{"read", "write", "account"},
		ClientIDEnv: "TRELLO_API_KEY", ClientSecretEnv: "TRELLO_API_SECRET",
		DocsURL:   "https://trello.com/power-ups/admin",
		SetupHint: "Trello Power-Ups admin → enable read/write/account",
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
