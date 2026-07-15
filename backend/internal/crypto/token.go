package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// TokenVault encrypts OAuth tokens at rest using AES-256-GCM.
type TokenVault struct {
	gcm cipher.AEAD
}

// NewTokenVault builds a vault from a raw key string.
// Accepts 32 raw bytes, base64-encoded 32 bytes, or any passphrase (hashed to 32 bytes).
func NewTokenVault(keyMaterial string) (*TokenVault, error) {
	key, err := deriveKey(keyMaterial)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &TokenVault{gcm: gcm}, nil
}

func deriveKey(material string) ([]byte, error) {
	if material == "" {
		return nil, errors.New("token encryption key is empty")
	}
	// Try standard base64 first.
	if decoded, err := base64.StdEncoding.DecodeString(material); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	if decoded, err := base64.RawStdEncoding.DecodeString(material); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	if len(material) == 32 {
		return []byte(material), nil
	}
	// Passphrase → SHA-256.
	sum := sha256.Sum256([]byte(material))
	return sum[:], nil
}

// Seal encrypts plaintext and returns base64(nonce|ciphertext).
func (v *TokenVault) Seal(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	nonce := make([]byte, v.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce: %w", err)
	}
	out := v.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(out), nil
}

// Open decrypts a Seal() result.
func (v *TokenVault) Open(sealed string) (string, error) {
	if sealed == "" {
		return "", nil
	}
	raw, err := base64.StdEncoding.DecodeString(sealed)
	if err != nil {
		return "", fmt.Errorf("decode: %w", err)
	}
	ns := v.gcm.NonceSize()
	if len(raw) < ns {
		return "", errors.New("ciphertext too short")
	}
	nonce, ct := raw[:ns], raw[ns:]
	pt, err := v.gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}
	return string(pt), nil
}
