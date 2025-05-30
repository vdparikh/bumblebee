// In auth/jwt.go or a new auth/context.go
package auth

// ... (other jwt code) ...

type contextKey string

const ContextKeyClaims = contextKey("userClaims")
