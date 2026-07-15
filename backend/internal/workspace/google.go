package workspace

import (
	"context"
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
	Events         []CalendarEvent `json:"events"`
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

func (c *GoogleClient) ListEvents(ctx context.Context, token string) ([]CalendarEvent, error) {
	now := time.Now().UTC()
	q := url.Values{}
	q.Set("timeMin", now.Format(time.RFC3339))
	q.Set("timeMax", now.Add(24*time.Hour).Format(time.RFC3339))
	q.Set("maxResults", "15")
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

func (c *GoogleClient) ListTasks(ctx context.Context, token string) ([]Task, error) {
	q := url.Values{}
	q.Set("maxResults", "20")
	q.Set("showCompleted", "false")
	rawURL := "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?" + q.Encode()

	body, code, err := c.get(ctx, token, rawURL)
	if err != nil {
		return nil, err
	}
	if code == 401 || code == 403 {
		return nil, &AuthError{Status: code, Body: string(body)}
	}
	if code >= 300 {
		// Tasks list may 404 if never used — treat as empty
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
		status := "needsAction"
		if t.Status == "completed" {
			status = "completed"
		}
		out = append(out, Task{ID: t.ID, Title: title, Due: t.Due, Status: status})
	}
	return out, nil
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
		Connected: true,
		FetchedAt: time.Now().UTC().Format(time.RFC3339),
		Events:    []CalendarEvent{},
		Tasks:     []Task{},
		Emails:    []Email{},
		Conflicts: []Conflict{},
	}

	events, err := c.ListEvents(ctx, token)
	if err != nil {
		if ae, ok := err.(*AuthError); ok {
			brief.Connected = false
			brief.TokenExpired = true
			return brief, ae
		}
		return nil, err
	}
	brief.Events = events
	brief.Conflicts = detectConflicts(events)

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
