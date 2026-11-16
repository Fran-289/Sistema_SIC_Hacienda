package sv.gob.hacienda.sic.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;
import sv.gob.hacienda.sic.entity.SystemLog;
import sv.gob.hacienda.sic.entity.User;

@ApplicationScoped
public class AuditService {

    private static final Logger LOG = Logger.getLogger(AuditService.class);

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void log(User user, String fallbackUserName, String action, String details) {
        try {
            SystemLog logEntry = new SystemLog();
            if (user != null) {
                logEntry.user = User.findById(user.id);
                logEntry.userName = user.name + " (" + user.email + ")";
            } else {
                logEntry.userName = InputSanitizer.cleanSingleLine(fallbackUserName);
            }
            logEntry.action = InputSanitizer.cleanSingleLine(action);
            logEntry.details = InputSanitizer.clean(details);
            logEntry.persist();
        } catch (Exception e) {
            LOG.warn("No se pudo registrar evento en system_logs: " + action, e);
        }
    }
}
