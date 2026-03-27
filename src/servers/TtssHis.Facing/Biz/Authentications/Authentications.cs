using Microsoft.AspNetCore.Mvc;
using TtssHis.Facing.Services;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Authentications;

[ApiController]
[Route("api/auth")]
public sealed class Authentications(HisDbContext db, JwtTokenService tokenService) : ControllerBase
{
    [HttpPost("login")]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Username and password are required.");

        var user = db.Users
            .Where(u => u.Username == request.Username && u.IsActive && u.DeletedDate == null)
            .Select(u => new { u.Id, u.Username, u.PasswordHash, u.FirstName, u.LastName, u.RoleId, u.DoctorId })
            .FirstOrDefault();

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized("Invalid username or password.");

        var fullUser = new Shared.Entities.Core.User
        {
            Id = user.Id,
            Username = user.Username,
            PasswordHash = user.PasswordHash,
            FirstName = user.FirstName,
            LastName = user.LastName,
            RoleId = user.RoleId,
            DoctorId = user.DoctorId,
        };

        var token = tokenService.GenerateToken(fullUser);
        return Ok(new LoginResponse(token, user.Id, user.Username, user.FirstName, user.LastName, user.RoleId));
    }
}

public record LoginRequest(string Username, string Password);
public record LoginResponse(string AccessToken, string UserId, string Username, string FirstName, string LastName, string Role);
