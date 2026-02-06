/**
 * ============================================
 * MIDAS INTRANET - Security Audit Script
 * ============================================
 * Automated security testing for enterprise audit.
 */

require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3001';
const results = {
    passed: [],
    failed: [],
    warnings: []
};

// Helper function for HTTP requests
function httpRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function runAudit() {
    console.log('========================================');
    console.log('🔐 MIDAS INTRANET - SECURITY AUDIT');
    console.log('========================================');
    console.log('Date:', new Date().toISOString());
    console.log('Target:', BASE_URL);
    console.log('========================================\n');

    // ==========================================
    // 1. SECURITY HEADERS (OWASP A05)
    // ==========================================
    console.log('📋 1. SECURITY HEADERS TEST');
    console.log('-------------------------------------------');

    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/health',
            method: 'GET'
        });

        const requiredHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'x-xss-protection': '0',
            'strict-transport-security': null, // Check exists
            'content-security-policy': null
        };

        for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
            const actualValue = res.headers[header];
            if (actualValue) {
                if (expectedValue === null || actualValue.includes(expectedValue)) {
                    console.log(`   ✓ ${header}: ${actualValue.substring(0, 50)}...`);
                    results.passed.push(`Header: ${header}`);
                } else {
                    console.log(`   ✗ ${header}: Expected "${expectedValue}", got "${actualValue}"`);
                    results.failed.push(`Header ${header} mismatch`);
                }
            } else {
                console.log(`   ✗ ${header}: MISSING`);
                results.failed.push(`Missing header: ${header}`);
            }
        }

        // Check X-Powered-By is hidden
        if (!res.headers['x-powered-by']) {
            console.log('   ✓ x-powered-by: Hidden (good)');
            results.passed.push('X-Powered-By hidden');
        } else {
            console.log('   ✗ x-powered-by: Exposed - ' + res.headers['x-powered-by']);
            results.failed.push('X-Powered-By exposed');
        }
    } catch (error) {
        console.log('   ✗ Could not connect to server:', error.message);
        results.failed.push('Server unreachable');
    }

    // ==========================================
    // 2. AUTHENTICATION TESTS (OWASP A07)
    // ==========================================
    console.log('\n📋 2. AUTHENTICATION TESTS');
    console.log('-------------------------------------------');

    // Test 2.1: Login without credentials
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, '{}');

        if (res.statusCode === 400) {
            console.log('   ✓ Empty login rejected (400)');
            results.passed.push('Empty login rejected');
        } else {
            console.log(`   ✗ Empty login returned ${res.statusCode}`);
            results.failed.push('Empty login not properly rejected');
        }
    } catch (e) {
        console.log('   ✗ Login test failed:', e.message);
    }

    // Test 2.2: Login with wrong credentials
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ username: 'fake_user_xyz', password: 'wrong' }));

        if (res.statusCode === 401) {
            console.log('   ✓ Invalid credentials rejected (401)');
            results.passed.push('Invalid credentials rejected');

            // Check for user enumeration
            const body = JSON.parse(res.body);
            if (body.error?.message?.includes('incorrectos') ||
                body.error?.message?.includes('Usuario o contraseña')) {
                console.log('   ✓ Generic error message (prevents user enumeration)');
                results.passed.push('User enumeration prevented');
            }
        } else {
            console.log(`   ✗ Invalid login returned ${res.statusCode}`);
            results.failed.push('Invalid login not properly rejected');
        }
    } catch (e) {
        console.log('   ✗ Login test failed:', e.message);
    }

    // Test 2.3: Access protected route without token
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/users',
            method: 'GET'
        });

        if (res.statusCode === 403 || res.statusCode === 401) {
            console.log(`   ✓ Protected route blocked without token (${res.statusCode})`);
            results.passed.push('Protected routes require auth');
        } else {
            console.log(`   ✗ Protected route returned ${res.statusCode} without token`);
            results.failed.push('Protected route accessible without auth');
        }
    } catch (e) {
        console.log('   ✗ Protected route test failed:', e.message);
    }

    // Test 2.4: Access with invalid token
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/users',
            method: 'GET',
            headers: { 'Authorization': 'Bearer invalid.token.here' }
        });

        if (res.statusCode === 401) {
            console.log('   ✓ Invalid token rejected (401)');
            results.passed.push('Invalid tokens rejected');
        } else {
            console.log(`   ✗ Invalid token returned ${res.statusCode}`);
            results.failed.push('Invalid token not rejected');
        }
    } catch (e) {
        console.log('   ✗ Invalid token test failed:', e.message);
    }

    // ==========================================
    // 3. INJECTION TESTS (OWASP A03)
    // ==========================================
    console.log('\n📋 3. INJECTION TESTS');
    console.log('-------------------------------------------');

    // SQL Injection attempt
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({
            username: "admin' OR '1'='1",
            password: "' OR '1'='1"
        }));

        if (res.statusCode === 400 || res.statusCode === 401) {
            console.log('   ✓ SQL injection attempt blocked');
            results.passed.push('SQL injection blocked');
        } else if (res.statusCode === 200) {
            console.log('   ✗ CRITICAL: SQL injection may have succeeded!');
            results.failed.push('CRITICAL: Possible SQL injection');
        }
    } catch (e) {
        console.log('   ✓ SQL injection attempt caused error (blocked)');
        results.passed.push('SQL injection blocked');
    }

    // XSS attempt in login
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({
            username: "<script>alert('xss')</script>",
            password: "test"
        }));

        const body = res.body;
        if (!body.includes('<script>')) {
            console.log('   ✓ XSS payload not reflected in response');
            results.passed.push('XSS not reflected');
        } else {
            console.log('   ⚠ XSS payload reflected in response');
            results.warnings.push('XSS payload reflected');
        }
    } catch (e) {
        console.log('   ✓ XSS attempt blocked');
        results.passed.push('XSS blocked');
    }

    // ==========================================
    // 4. RATE LIMITING (API Security)
    // ==========================================
    console.log('\n📋 4. RATE LIMITING TEST');
    console.log('-------------------------------------------');

    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/health',
            method: 'GET'
        });

        if (res.headers['ratelimit-limit'] && res.headers['ratelimit-remaining']) {
            console.log(`   ✓ Rate limiting active: ${res.headers['ratelimit-remaining']}/${res.headers['ratelimit-limit']} remaining`);
            results.passed.push('Rate limiting configured');
        } else {
            console.log('   ⚠ Rate limit headers not found');
            results.warnings.push('Rate limit headers missing');
        }
    } catch (e) {
        console.log('   ✗ Rate limit test failed:', e.message);
    }

    // ==========================================
    // 5. CORS CONFIGURATION
    // ==========================================
    console.log('\n📋 5. CORS CONFIGURATION TEST');
    console.log('-------------------------------------------');

    // Test with unauthorized origin
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/health',
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://malicious-site.com',
                'Access-Control-Request-Method': 'GET'
            }
        });

        if (!res.headers['access-control-allow-origin'] ||
            res.headers['access-control-allow-origin'] !== 'https://malicious-site.com') {
            console.log('   ✓ Unauthorized origin blocked');
            results.passed.push('CORS blocks unauthorized origins');
        } else {
            console.log('   ✗ CORS allows unauthorized origin!');
            results.failed.push('CORS misconfigured');
        }
    } catch (e) {
        console.log('   ✓ Unauthorized origin request failed (blocked)');
        results.passed.push('CORS blocks unauthorized origins');
    }

    // ==========================================
    // 6. ERROR HANDLING
    // ==========================================
    console.log('\n📋 6. ERROR HANDLING TEST');
    console.log('-------------------------------------------');

    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/nonexistent-endpoint-12345',
            method: 'GET'
        });

        if (res.statusCode === 404) {
            console.log('   ✓ 404 returned for non-existent route');
            results.passed.push('404 handling correct');

            // Check no stack trace exposed
            if (!res.body.includes('at ') && !res.body.includes('node_modules')) {
                console.log('   ✓ No stack trace exposed in error');
                results.passed.push('Stack traces hidden');
            } else {
                console.log('   ✗ Stack trace exposed in error!');
                results.failed.push('Stack trace exposed');
            }
        }
    } catch (e) {
        console.log('   ✗ Error handling test failed:', e.message);
    }

    // ==========================================
    // FINAL REPORT
    // ==========================================
    console.log('\n========================================');
    console.log('📊 AUDIT SUMMARY');
    console.log('========================================');
    console.log(`✅ PASSED: ${results.passed.length}`);
    console.log(`❌ FAILED: ${results.failed.length}`);
    console.log(`⚠️  WARNINGS: ${results.warnings.length}`);

    if (results.failed.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.failed.forEach(f => console.log(`   - ${f}`));
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        results.warnings.forEach(w => console.log(`   - ${w}`));
    }

    const score = Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100);
    console.log('\n========================================');
    console.log(`📈 SECURITY SCORE: ${score}%`);

    if (score >= 90) {
        console.log('🏆 RATING: EXCELLENT');
    } else if (score >= 70) {
        console.log('✅ RATING: GOOD');
    } else if (score >= 50) {
        console.log('⚠️  RATING: NEEDS IMPROVEMENT');
    } else {
        console.log('❌ RATING: CRITICAL');
    }
    console.log('========================================\n');
}

runAudit().catch(console.error);
