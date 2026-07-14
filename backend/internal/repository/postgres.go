package repository

import (
	"context"
	"time"

	"github.com/gamp/butler/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PgChatRepository struct {
	pool *pgxpool.Pool
}

func NewPgChatRepository(pool *pgxpool.Pool) *PgChatRepository {
	return &PgChatRepository{pool: pool}
}

func (r *PgChatRepository) CreateThread(ctx context.Context, thread *model.ChatThread) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO chat_threads (id, user_id, title, subtitle, tag, tone, last_message_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		thread.ID, thread.UserID, thread.Title, thread.Subtitle, thread.Tag, thread.Tone,
		thread.LastMessageAt, thread.CreatedAt, thread.UpdatedAt,
	)
	return err
}

func (r *PgChatRepository) GetThreadsByUser(ctx context.Context, userID string) ([]*model.ChatThread, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, title, subtitle, tag, tone, last_message_at, created_at, updated_at
		 FROM chat_threads WHERE user_id = $1 ORDER BY updated_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var threads []*model.ChatThread
	for rows.Next() {
		t := &model.ChatThread{}
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Subtitle, &t.Tag, &t.Tone,
			&t.LastMessageAt, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		threads = append(threads, t)
	}
	return threads, rows.Err()
}

func (r *PgChatRepository) GetThread(ctx context.Context, threadID string) (*model.ChatThread, error) {
	t := &model.ChatThread{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, subtitle, tag, tone, last_message_at, created_at, updated_at
		 FROM chat_threads WHERE id = $1`, threadID,
	).Scan(&t.ID, &t.UserID, &t.Title, &t.Subtitle, &t.Tag, &t.Tone,
		&t.LastMessageAt, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *PgChatRepository) UpdateThread(ctx context.Context, thread *model.ChatThread) error {
	thread.UpdatedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx,
		`UPDATE chat_threads SET title = $1, subtitle = $2, tag = $3, tone = $4, last_message_at = $5, updated_at = $6 WHERE id = $7`,
		thread.Title, thread.Subtitle, thread.Tag, thread.Tone, thread.LastMessageAt, thread.UpdatedAt, thread.ID,
	)
	return err
}

func (r *PgChatRepository) CreateMessage(ctx context.Context, msg *model.ChatMessage) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO chat_messages (id, thread_id, role, text, mode, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		msg.ID, msg.ThreadID, msg.Role, msg.Text, msg.Mode, msg.CreatedAt,
	)
	return err
}

func (r *PgChatRepository) GetMessagesByThread(ctx context.Context, threadID string) ([]*model.ChatMessage, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, thread_id, role, text, mode, created_at
		 FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC`, threadID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*model.ChatMessage
	for rows.Next() {
		m := &model.ChatMessage{}
		if err := rows.Scan(&m.ID, &m.ThreadID, &m.Role, &m.Text, &m.Mode, &m.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

type PgNotesRepository struct {
	pool *pgxpool.Pool
}

func NewPgNotesRepository(pool *pgxpool.Pool) *PgNotesRepository {
	return &PgNotesRepository{pool: pool}
}

func (r *PgNotesRepository) Create(ctx context.Context, note *model.Note) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO notes (id, user_id, title, content, color, tag, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		note.ID, note.UserID, note.Title, note.Content, note.Color, note.Tag, note.CreatedAt, note.UpdatedAt,
	)
	return err
}

func (r *PgNotesRepository) GetAllByUser(ctx context.Context, userID string) ([]*model.Note, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, title, content, color, tag, created_at, updated_at
		 FROM notes WHERE user_id = $1 ORDER BY updated_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []*model.Note
	for rows.Next() {
		n := &model.Note{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.Color, &n.Tag, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

func (r *PgNotesRepository) GetByID(ctx context.Context, id string) (*model.Note, error) {
	n := &model.Note{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, content, color, tag, created_at, updated_at
		 FROM notes WHERE id = $1`, id,
	).Scan(&n.ID, &n.UserID, &n.Title, &n.Content, &n.Color, &n.Tag, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return n, nil
}

func (r *PgNotesRepository) Update(ctx context.Context, note *model.Note) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE notes SET title = $1, content = $2, color = $3, tag = $4, updated_at = $5 WHERE id = $6`,
		note.Title, note.Content, note.Color, note.Tag, note.UpdatedAt, note.ID,
	)
	return err
}

func (r *PgNotesRepository) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM notes WHERE id = $1`, id)
	return err
}

type PgDelegationsRepository struct {
	pool *pgxpool.Pool
}

func NewPgDelegationsRepository(pool *pgxpool.Pool) *PgDelegationsRepository {
	return &PgDelegationsRepository{pool: pool}
}

func (r *PgDelegationsRepository) Create(ctx context.Context, d *model.Delegation) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO delegations (id, user_id, title, service, context, draft, tone, tone_label, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		d.ID, d.UserID, d.Title, d.Service, d.Context, d.Draft, d.Tone, d.ToneLabel, d.Status, d.CreatedAt, d.UpdatedAt,
	)
	return err
}

func (r *PgDelegationsRepository) GetAllByUser(ctx context.Context, userID string, status *string) ([]*model.Delegation, error) {
	query := `SELECT id, user_id, title, service, context, draft, tone, tone_label, status, created_at, updated_at
		 FROM delegations WHERE user_id = $1`
	args := []interface{}{userID}

	if status != nil && *status != "" {
		query += " AND status = $2"
		args = append(args, *status)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var delegations []*model.Delegation
	for rows.Next() {
		d := &model.Delegation{}
		if err := rows.Scan(&d.ID, &d.UserID, &d.Title, &d.Service, &d.Context, &d.Draft,
			&d.Tone, &d.ToneLabel, &d.Status, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		delegations = append(delegations, d)
	}
	return delegations, rows.Err()
}

func (r *PgDelegationsRepository) GetByID(ctx context.Context, id string) (*model.Delegation, error) {
	d := &model.Delegation{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, service, context, draft, tone, tone_label, status, created_at, updated_at
		 FROM delegations WHERE id = $1`, id,
	).Scan(&d.ID, &d.UserID, &d.Title, &d.Service, &d.Context, &d.Draft,
		&d.Tone, &d.ToneLabel, &d.Status, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return d, nil
}

func (r *PgDelegationsRepository) Update(ctx context.Context, d *model.Delegation) error {
	d.UpdatedAt = time.Now().UTC()
	_, err := r.pool.Exec(ctx,
		`UPDATE delegations SET status = $1, updated_at = $2 WHERE id = $3`,
		d.Status, d.UpdatedAt, d.ID,
	)
	return err
}

type PgNotificationsRepository struct {
	pool *pgxpool.Pool
}

func NewPgNotificationsRepository(pool *pgxpool.Pool) *PgNotificationsRepository {
	return &PgNotificationsRepository{pool: pool}
}

func (r *PgNotificationsRepository) GetAllByUser(ctx context.Context, userID string, source *string) ([]*model.Notification, error) {
	query := `SELECT id, user_id, title, body, source, tone, read, created_at
		 FROM notifications WHERE user_id = $1`
	args := []interface{}{userID}

	if source != nil && *source != "" {
		query += " AND source = $2"
		args = append(args, *source)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []*model.Notification
	for rows.Next() {
		n := &model.Notification{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Body, &n.Source, &n.Tone, &n.Read, &n.CreatedAt); err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	return notifications, rows.Err()
}

func (r *PgNotificationsRepository) GetByID(ctx context.Context, id string) (*model.Notification, error) {
	n := &model.Notification{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, body, source, tone, read, created_at
		 FROM notifications WHERE id = $1`, id,
	).Scan(&n.ID, &n.UserID, &n.Title, &n.Body, &n.Source, &n.Tone, &n.Read, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return n, nil
}

func (r *PgNotificationsRepository) MarkRead(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE notifications SET read = true WHERE id = $1`, id)
	return err
}

func (r *PgNotificationsRepository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, userID)
	return err
}

type PgSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewPgSettingsRepository(pool *pgxpool.Pool) *PgSettingsRepository {
	return &PgSettingsRepository{pool: pool}
}

func (r *PgSettingsRepository) Get(ctx context.Context, userID string) (*model.UserSettings, error) {
	s := &model.UserSettings{}
	err := r.pool.QueryRow(ctx,
		`SELECT user_id, theme, chat_mode, timezone, warmth, formality, brevity, location_auto_detect, location_text, integrations
		 FROM user_settings WHERE user_id = $1`, userID,
	).Scan(&s.UserID, &s.Theme, &s.ChatMode, &s.Timezone, &s.Warmth, &s.Formality, &s.Brevity,
		&s.LocationAutoDetect, &s.LocationText, &s.Integrations)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *PgSettingsRepository) Upsert(ctx context.Context, s *model.UserSettings) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO user_settings (user_id, theme, chat_mode, timezone, warmth, formality, brevity, location_auto_detect, location_text, integrations)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (user_id) DO UPDATE SET
		   theme = EXCLUDED.theme,
		   chat_mode = EXCLUDED.chat_mode,
		   timezone = EXCLUDED.timezone,
		   warmth = EXCLUDED.warmth,
		   formality = EXCLUDED.formality,
		   brevity = EXCLUDED.brevity,
		   location_auto_detect = EXCLUDED.location_auto_detect,
		   location_text = EXCLUDED.location_text,
		   integrations = EXCLUDED.integrations`,
		s.UserID, s.Theme, s.ChatMode, s.Timezone, s.Warmth, s.Formality, s.Brevity,
		s.LocationAutoDetect, s.LocationText, s.Integrations,
	)
	return err
}
