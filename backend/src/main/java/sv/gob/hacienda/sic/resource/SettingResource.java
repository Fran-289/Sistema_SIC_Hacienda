package sv.gob.hacienda.sic.resource;

import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import sv.gob.hacienda.sic.entity.SystemSetting;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Path("/api/settings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "USER"})
public class SettingResource {

    @GET
    public Map<String, String> obtenerConfiguracion() {
        List<SystemSetting> settings = SystemSetting.listAll();
        Map<String, String> map = new LinkedHashMap<>();
        for (SystemSetting s : settings) {
            map.put(s.settingKey, s.settingValue);
        }
        return map;
    }
}
