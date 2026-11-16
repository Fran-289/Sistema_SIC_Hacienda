package sv.gob.hacienda.sic.security;

import jakarta.enterprise.context.ApplicationScoped;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 15 * 60; // 15 minutos
    private static final int MAX_CACHE_SIZE = 5000;

    private static final class AttemptRecord {
        int count;
        long firstAttemptEpoch;
        long blockedUntilEpoch;
    }

    private final Map<String, AttemptRecord> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String ip, String email) {
        cleanupIfNeeded();
        long now = Instant.now().getEpochSecond();
        return isKeyBlocked(buildKey(ip, email), now) || isKeyBlocked("ip:" + safe(ip), now);
    }

    public void recordFailure(String ip, String email) {
        long now = Instant.now().getEpochSecond();
        incrementKey(buildKey(ip, email), now, MAX_ATTEMPTS);
        incrementKey("ip:" + safe(ip), now, MAX_ATTEMPTS * 3);
    }

    public void recordSuccess(String ip, String email) {
        attempts.remove(buildKey(ip, email));
    }

    private boolean isKeyBlocked(String key, long now) {
        AttemptRecord rec = attempts.get(key);
        if (rec == null) {
            return false;
        }
        synchronized (rec) {
            if (rec.blockedUntilEpoch > now) {
                return true;
            }
            if (now - rec.firstAttemptEpoch > WINDOW_SECONDS) {
                attempts.remove(key);
            }
            return false;
        }
    }

    private void incrementKey(String key, long now, int threshold) {
        AttemptRecord rec = attempts.computeIfAbsent(key, k -> {
            AttemptRecord r = new AttemptRecord();
            r.firstAttemptEpoch = now;
            return r;
        });
        synchronized (rec) {
            if (now - rec.firstAttemptEpoch > WINDOW_SECONDS) {
                rec.count = 0;
                rec.firstAttemptEpoch = now;
                rec.blockedUntilEpoch = 0;
            }
            rec.count++;
            if (rec.count >= threshold) {
                rec.blockedUntilEpoch = now + WINDOW_SECONDS;
            }
        }
    }

    private void cleanupIfNeeded() {
        if (attempts.size() <= MAX_CACHE_SIZE) {
            return;
        }
        long now = Instant.now().getEpochSecond();
        attempts.entrySet().removeIf(e -> {
            AttemptRecord r = e.getValue();
            return r.blockedUntilEpoch < now && (now - r.firstAttemptEpoch > WINDOW_SECONDS);
        });
    }

    private String buildKey(String ip, String email) {
        return safe(ip) + "|" + safe(email);
    }

    private String safe(String val) {
        return val == null ? "unknown" : val.trim().toLowerCase();
    }
}
