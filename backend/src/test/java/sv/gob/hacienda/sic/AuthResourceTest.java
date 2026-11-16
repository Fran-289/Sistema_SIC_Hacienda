package sv.gob.hacienda.sic;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class AuthResourceTest {

    @Test
    public void testApiStatus() {
        given()
            .when().get("/api")
            .then()
            .statusCode(200)
            .body("status", equalTo("UP"));
    }

    @Test
    public void testLoginWithInvalidCredentials() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"email\":\"wrong@email.com\",\"password\":\"wrongpass\"}")
            .when().post("/api/auth/login")
            .then()
            .statusCode(401);
    }

    @Test
    public void testLoginWithEmptyBody() {
        given()
            .contentType(ContentType.JSON)
            .body("{}")
            .when().post("/api/auth/login")
            .then()
            .statusCode(anyOf(is(400), is(401)));
    }
}
