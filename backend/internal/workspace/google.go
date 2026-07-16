package workspace

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// GoogleClient calls Workspace APIs with a user OAuth access token.
type GoogleClient struct {
	http *http.Client
}

func NewGoogleClient() *GoogleClient {
	return &GoogleClient{http: &http.Client{Timeout: 20 * time.Second}}
}

type CalendarEvent struct {
	ID          string `json:"id"`
	Summary     string `json:"summary"`
	Start       string `json:"start"`
	End         string `json:"end"`
	Description string `json:"description,omitempty"`
	Location    string `json:"location,omitempty"`
}

type Task struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Due    string `json:"due,omitempty"`
	Status string `json:"status"`
}

type Email struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
	From    string `json:"from"`
	Snippet string `json:"snippet"`
	Date    string `json:"date"`
}

// Brief is the command-center payload.
type Brief struct {
	Events         []CalendarEvent `json:"events"`         // today only
	WeekEvents     []CalendarEvent `json:"weekEvents"`     // next 7 days
	Tasks          []Task          `json:"tasks"`
	Emails         []Email         `json:"emails"`
	Conflicts      []Conflict      `json:"conflicts"`
	Connected      bool            `json:"connected"`
	TokenExpired   bool            `json:"tokenExpired,omitempty"`
	FetchedAt      string          `json:"fetchedAt"`
}

type Conflict struct {
	Time       string `json:"time"`
	Title      string `json:"title"`
	Resolution string `json:"resolution"`
}

func (c *GoogleClient) get(ctx context.Context, token, rawURL string) ([]byte, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return body, resp.StatusCode, nil
}

// ListEvents returns calendar events from now through the given duration (default 24h).
func (c *GoogleClient) ListEvents(ctx context.Context, token string) ([]CalendarEvent, error) {
	return c.ListEventsRange(ctx, token, 24*time.Hour, 20)
}

// ListEventsRange returns events from now through duration.
func (c *GoogleClient) ListEventsRange(ctx context.Context, token string, duration time.Duration, max int) ([]CalendarEvent, error) {
	if duration <= 0 {
		duration = 24 * time.Hour
	}
	if max <= 0 {
		max = 20
	}
	now := time.Now().UTC()
	q := url.Values{}
	q.Set("timeMin", now.Format(time.RFC3339))
	q.Set("timeMax", now.Add(duration).Format(time.RFC3339))
	q.Set("maxResults", fmt.Sprintf("%d", max))
	q.Set("singleEvents", "true")
	q.Set("orderBy", "startTime")
	rawURL := "https://www.googleapis.com/calendar/v3/calendars/primary/events?" + q.Encode()

	body, code, err := c.get(ctx, token, rawURL)
	if err != nil {
		return nil, err
	}
	if code == 401 || code == 403 {
		return nil, &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		return nil, fmt.Errorf("calendar: %d %s", code, string(body))
	}

	var parsed struct {
		Items []struct {
			ID          string `json:"id"`
			Summary     string `json:"summary"`
			Description string `json:"description"`
			Location    string `json:"location"`
			Start       struct {
				DateTime string `json:"dateTime"`
				Date     string `json:"date"`
			} `json:"start"`
			End struct {
				DateTime string `json:"dateTime"`
				Date     string `json:"date"`
			} `json:"end"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	out := make([]CalendarEvent, 0, len(parsed.Items))
	for _, e := range parsed.Items {
		start := e.Start.DateTime
		if start == "" {
			start = e.Start.Date
		}
		end := e.End.DateTime
		if end == "" {
			end = e.End.Date
		}
		sum := e.Summary
		if sum == "" {
			sum = "(No title)"
		}
		out = append(out, CalendarEvent{
			ID: e.ID, Summary: sum, Start: start, End: end,
			Description: e.Description, Location: e.Location,
		})
	}
	return out, nil
}

func (c *GoogleClient) doJSON(ctx context.Context, method, token, rawURL string, payload any) ([]byte, int, error) {
	var bodyReader io.Reader
	if payload != nil {
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, 0, err
		}
		bodyReader = strings.NewReader(string(b))
	}
	req, err := http.NewRequestWithContext(ctx, method, rawURL, bodyReader)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return body, resp.StatusCode, nil
}

// taskListIDs returns Google Tasks list IDs (falls back to @default).
func (c *GoogleClient) taskListIDs(ctx context.Context, token string) ([]string, error) {
	body, code, err := c.get(ctx, token, "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20")
	if err != nil {
		return nil, err
	}
	if code == 401 || code == 403 {
		return nil, &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		// Fall back to @default if lists endpoint fails
		return []string{"@default"}, nil
	}
	var parsed struct {
		Items []struct {
			ID string `json:"id"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return []string{"@default"}, nil
	}
	ids := make([]string, 0, len(parsed.Items))
	for _, it := range parsed.Items {
		if it.ID != "" {
			ids = append(ids, it.ID)
		}
	}
	if len(ids) == 0 {
		return []string{"@default"}, nil
	}
	return ids, nil
}

func (c *GoogleClient) listTasksInList(ctx context.Context, token, listID string) ([]Task, error) {
	q := url.Values{}
	q.Set("maxResults", "40")
	q.Set("showCompleted", "false")
	q.Set("showHidden", "false")
	rawURL := fmt.Sprintf("https://tasks.googleapis.com/tasks/v1/lists/%s/tasks?%s", url.PathEscape(listID), q.Encode())

	body, code, err := c.get(ctx, token, rawURL)
	if err != nil {
		return nil, err
	}
	if code == 401 || code == 403 {
		return nil, &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		if code == 404 {
			return []Task{}, nil
		}
		return nil, fmt.Errorf("tasks: %d %s", code, string(body))
	}

	var parsed struct {
		Items []struct {
			ID     string `json:"id"`
			Title  string `json:"title"`
			Due    string `json:"due"`
			Status string `json:"status"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	out := make([]Task, 0, len(parsed.Items))
	for _, t := range parsed.Items {
		title := t.Title
		if title == "" {
			title = "(Untitled)"
		}
		// Skip empty placeholder tasks Google sometimes inserts
		if strings.TrimSpace(title) == "" {
			continue
		}
		status := "needsAction"
		if t.Status == "completed" {
			status = "completed"
		}
		// Prefix list id so complete can route (id only is enough for Tasks API if we also store list)
		out = append(out, Task{ID: listID + ":" + t.ID, Title: title, Due: t.Due, Status: status})
	}
	return out, nil
}

func (c *GoogleClient) ListTasks(ctx context.Context, token string) ([]Task, error) {
	listIDs, err := c.taskListIDs(ctx, token)
	if err != nil {
		return nil, err
	}
	seen := map[string]bool{}
	out := make([]Task, 0, 40)
	for _, listID := range listIDs {
		items, err := c.listTasksInList(ctx, token, listID)
		if err != nil {
			if _, ok := err.(*AuthError); ok {
				return nil, err
			}
			continue
		}
		for _, t := range items {
			// Deduplicate by bare task id
			bare := t.ID
			if i := strings.LastIndex(t.ID, ":"); i >= 0 {
				bare = t.ID[i+1:]
			}
			if seen[bare] {
				continue
			}
			seen[bare] = true
			out = append(out, t)
			if len(out) >= 40 {
				return out, nil
			}
		}
	}
	return out, nil
}

// CreateTask adds a task to the user's default (or first) Google Tasks list.
func (c *GoogleClient) CreateTask(ctx context.Context, token, title, notes, dueRFC3339 string) (*Task, error) {
	listIDs, err := c.taskListIDs(ctx, token)
	if err != nil {
		return nil, err
	}
	listID := listIDs[0]
	payload := map[string]any{
		"title":  title,
		"status": "needsAction",
	}
	if notes != "" {
		payload["notes"] = notes
	}
	if dueRFC3339 != "" {
		payload["due"] = dueRFC3339
	}
	rawURL := fmt.Sprintf("https://tasks.googleapis.com/tasks/v1/lists/%s/tasks", url.PathEscape(listID))
	body, code, err := c.doJSON(ctx, http.MethodPost, token, rawURL, payload)
	if err != nil {
		return nil, err
	}
	if code == 401 || code == 403 {
		return nil, &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		return nil, fmt.Errorf("tasks create: %d %s", code, string(body))
	}
	var parsed struct {
		ID     string `json:"id"`
		Title  string `json:"title"`
		Due    string `json:"due"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	status := "needsAction"
	if parsed.Status == "completed" {
		status = "completed"
	}
	return &Task{ID: listID + ":" + parsed.ID, Title: parsed.Title, Due: parsed.Due, Status: status}, nil
}

// CompleteTask marks a Google Task as done. taskID may be "listId:taskId" or bare id (uses first list).
func (c *GoogleClient) CompleteTask(ctx context.Context, token, taskID string) error {
	listID, bare := splitTaskID(taskID)
	if listID == "" {
		ids, err := c.taskListIDs(ctx, token)
		if err != nil {
			return err
		}
		listID = ids[0]
	}
	payload := map[string]any{
		"id":     bare,
		"status": "completed",
	}
	rawURL := fmt.Sprintf(
		"https://tasks.googleapis.com/tasks/v1/lists/%s/tasks/%s",
		url.PathEscape(listID), url.PathEscape(bare),
	)
	body, code, err := c.doJSON(ctx, http.MethodPatch, token, rawURL, payload)
	if err != nil {
		return err
	}
	if code == 401 || code == 403 {
		return &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		return fmt.Errorf("tasks complete: %d %s", code, string(body))
	}
	return nil
}

func splitTaskID(id string) (listID, taskID string) {
	if i := strings.Index(id, ":"); i > 0 {
		return id[:i], id[i+1:]
	}
	return "", id
}

// SendGmail sends a plain-text email via the Gmail API.
func (c *GoogleClient) SendGmail(ctx context.Context, token, to, subject, bodyText string) error {
	to = strings.TrimSpace(to)
	if to == "" {
		return fmt.Errorf("gmail send: missing recipient")
	}
	// Extract email if Context was "Name <email@x.com>"
	if i := strings.Index(to, "<"); i >= 0 {
		if j := strings.Index(to, ">"); j > i {
			to = strings.TrimSpace(to[i+1 : j])
		}
	}
	var msg strings.Builder
	msg.WriteString("To: " + to + "\r\n")
	msg.WriteString("Subject: " + sanitizeHeader(subject) + "\r\n")
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(bodyText)

	// Gmail requires base64url encoding of the raw message (no padding)
	raw := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString([]byte(msg.String()))
	payload := map[string]string{"raw": raw}
	body, code, err := c.doJSON(ctx, http.MethodPost, token, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", payload)
	if err != nil {
		return err
	}
	if code == 401 || code == 403 {
		return &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		return fmt.Errorf("gmail send: %d %s", code, string(body))
	}
	return nil
}

func sanitizeHeader(s string) string {
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	return strings.TrimSpace(s)
}

func (c *GoogleClient) ListInbox(ctx context.Context, token string, max int) ([]Email, error) {
	if max <= 0 {
		max = 8
	}
	q := url.Values{}
	q.Set("maxResults", fmt.Sprintf("%d", max))
	q.Set("q", "is:inbox")
	listURL := "https://gmail.googleapis.com/gmail/v1/users/me/messages?" + q.Encode()

	body, code, err := c.get(ctx, token, listURL)
	if err != nil {
		return nil, err
	}
	if code == 401 || code == 403 {
		return nil, &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		return nil, fmt.Errorf("gmail list: %d %s", code, string(body))
	}

	var list struct {
		Messages []struct {
			ID string `json:"id"`
		} `json:"messages"`
	}
	if err := json.Unmarshal(body, &list); err != nil {
		return nil, err
	}

	out := make([]Email, 0, len(list.Messages))
	for i, m := range list.Messages {
		if i >= max {
			break
		}
		detailURL := fmt.Sprintf(
			"https://gmail.googleapis.com/gmail/v1/users/me/messages/%s?format=metadata&metadataHeaders=Subject&metadataHeaders=From",
			url.PathEscape(m.ID),
		)
		db, dcode, derr := c.get(ctx, token, detailURL)
		if derr != nil || dcode >= 300 {
			continue
		}
		var d struct {
			ID           string `json:"id"`
			Snippet      string `json:"snippet"`
			InternalDate string `json:"internalDate"`
			Payload      struct {
				Headers []struct {
					Name  string `json:"name"`
					Value string `json:"value"`
				} `json:"headers"`
			} `json:"payload"`
		}
		if err := json.Unmarshal(db, &d); err != nil {
			continue
		}
		subject, from := "(No subject)", ""
		for _, h := range d.Payload.Headers {
			switch h.Name {
			case "Subject":
				subject = h.Value
			case "From":
				from = strings.TrimSpace(strings.Split(h.Value, "<")[0])
			}
		}
		ms := int64(0)
		fmt.Sscanf(d.InternalDate, "%d", &ms)
		date := time.UnixMilli(ms).UTC().Format(time.RFC3339)
		out = append(out, Email{ID: d.ID, Subject: subject, From: from, Snippet: d.Snippet, Date: date})
	}
	return out, nil
}

// FetchBrief loads calendar, tasks, and mail for the command center.
func (c *GoogleClient) FetchBrief(ctx context.Context, token string) (*Brief, error) {
	brief := &Brief{
		Connected:  true,
		FetchedAt:  time.Now().UTC().Format(time.RFC3339),
		Events:     []CalendarEvent{},
		WeekEvents: []CalendarEvent{},
		Tasks:      []Task{},
		Emails:     []Email{},
		Conflicts:  []Conflict{},
	}

	// Week of events; split into today vs rest of week on the client/service.
	weekEvents, err := c.ListEventsRange(ctx, token, 7*24*time.Hour, 40)
	if err != nil {
		if ae, ok := err.(*AuthError); ok {
			brief.Connected = false
			brief.TokenExpired = true
			return brief, ae
		}
		return nil, err
	}
	brief.WeekEvents = weekEvents
	brief.Events = filterTodayEvents(weekEvents)
	brief.Conflicts = detectConflicts(brief.Events)

	tasks, err := c.ListTasks(ctx, token)
	if err != nil {
		if _, ok := err.(*AuthError); ok {
			brief.TokenExpired = true
			brief.Connected = false
			return brief, err
		}
		// non-fatal
	} else {
		brief.Tasks = tasks
	}

	emails, err := c.ListInbox(ctx, token, 8)
	if err != nil {
		if _, ok := err.(*AuthError); ok {
			brief.TokenExpired = true
			brief.Connected = false
			return brief, err
		}
	} else {
		brief.Emails = emails
	}
	return brief, nil
}

func filterTodayEvents(events []CalendarEvent) []CalendarEvent {
	now := time.Now()
	y, m, d := now.Date()
	startOfDay := time.Date(y, m, d, 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	out := make([]CalendarEvent, 0, len(events))
	for _, e := range events {
		t := parseTime(e.Start)
		if t.IsZero() {
			// All-day date YYYY-MM-DD
			if len(e.Start) >= 10 {
				if t2, err := time.ParseInLocation("2006-01-02", e.Start[:10], now.Location()); err == nil {
					if !t2.Before(startOfDay) && t2.Before(endOfDay) {
						out = append(out, e)
					}
					continue
				}
			}
			continue
		}
		if !t.Before(startOfDay) && t.Before(endOfDay) {
			out = append(out, e)
		}
	}
	return out
}

func detectConflicts(events []CalendarEvent) []Conflict {
	var out []Conflict
	type iv struct {
		start, end time.Time
		title      string
	}
	var ivs []iv
	for _, e := range events {
		s, e1 := parseTime(e.Start), parseTime(e.End)
		if s.IsZero() || e1.IsZero() {
			continue
		}
		ivs = append(ivs, iv{start: s, end: e1, title: e.Summary})
	}
	for i := 0; i < len(ivs); i++ {
		for j := i + 1; j < len(ivs); j++ {
			a, b := ivs[i], ivs[j]
			if a.start.Before(b.end) && b.start.Before(a.end) {
				out = append(out, Conflict{
					Time:       a.start.Local().Format("15:04"),
					Title:      a.title + " × " + b.title,
					Resolution: "overlap flagged for your review",
				})
			}
		}
	}
	if len(out) > 3 {
		out = out[:3]
	}
	return out
}

func parseTime(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t
	}
	return time.Time{}
}

// AuthError indicates the Google token is invalid or missing scopes.
type AuthError struct {
	Status int
	Body   string
}

func (e *AuthError) Error() string {
	return fmt.Sprintf("google auth error %d", e.Status)
}
