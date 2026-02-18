/**
 * ============================================
 * MIDAS INTRANET - Security Middleware (Helmet + CSP)
 * ============================================
 * Enterprise-grade HTTP security headers.
 * OWASP compliant configuration.
 */

const helmet = require('helmet');

const securityMiddleware = (app) => {
    // 1. Helmet with strict CSP
    app.use(helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",  // Required for React in some cases
                    "https://www.google.com",
                    "https://www.gstatic.com"  // reCAPTCHA
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",  // Required for TailwindCSS
                    "https://fonts.googleapis.com",
                    "https://cdnjs.cloudflare.com"  // Font Awesome
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "https://cdnjs.cloudflare.com"
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "https://via.placeholder.com",
                    "https://images.unsplash.com",
                    "https://*.unsplash.com"
                ],
                connectSrc: [
                    "'self'",
                    "http://172.16.45.2:3001",
                    "https://www.google.com"  // reCAPTCHA validation
                ],
                frameSrc: [
                    "'self'",
                    "https://www.google.com"  // reCAPTCHA iframe
                ],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: []
            }
        },

        // Cross-Origin settings
        crossOriginEmbedderPolicy: false,  // Needed for external images
        crossOriginResourcePolicy: { policy: "cross-origin" },

        // DNS Prefetch Control
        dnsPrefetchControl: { allow: false },

        // Frameguard (Clickjacking protection)
        frameguard: { action: 'deny' },

        // Hide X-Powered-By
        hidePoweredBy: true,

        // HSTS (only in production)
        hsts: process.env.NODE_ENV === 'production' ? {
            maxAge: 31536000,  // 1 year
            includeSubDomains: true,
            preload: true
        } : false,

        // IE no open
        ieNoOpen: true,

        // No sniff MIME types
        noSniff: true,

        // Origin Agent Cluster
        originAgentCluster: true,

        // Permitted Cross-Domain Policies
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },

        // Referrer Policy
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

        // XSS Filter
        xssFilter: true
    }));

    // 2. Additional security headers
    app.use((req, res, next) => {
        // Prevent caching of sensitive data
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Permissions Policy (restrict browser features)
        res.setHeader('Permissions-Policy',
            'geolocation=(), microphone=(), camera=(), payment=(), usb=()');

        next();
    });
};

module.exports = securityMiddleware;
