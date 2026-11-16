package sv.gob.hacienda.sic.dto;

import java.util.Map;

public class LoginResponse {

    public boolean success;
    public String token;
    public String message;
    public Map<String, Object> user;

    public LoginResponse() {}

    public LoginResponse(boolean success, String token, String message, Map<String, Object> user) {
        this.success = success;
        this.token = token;
        this.message = message;
        this.user = user;
    }
}
