// src/servers/TtssHis.Facing/Biz/Admin/Admin.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Core;
using TtssHis.Shared.Entities.Product;

namespace TtssHis.Facing.Biz.Admin;

[ApiController]
[Authorize]
public sealed class AdminController(HisDbContext db) : ControllerBase
{
    // ══════════════════════════════════════════════════════════════════════
    // USERS
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/users</summary>
    [HttpGet("api/admin/users")]
    public ActionResult<IEnumerable<UserDto>> ListUsers()
    {
        var users = db.Users
            .Where(u => u.DeletedDate == null)
            .OrderBy(u => u.Username)
            .Select(u => new UserDto(u.Id, u.Username, u.FirstName, u.LastName, u.RoleId, u.IsActive, u.CreatedDate))
            .ToList();
        return Ok(users);
    }

    /// <summary>POST /api/admin/users — create user</summary>
    [HttpPost("api/admin/users")]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserRequest req)
    {
        if (db.Users.Any(u => u.Username == req.Username && u.DeletedDate == null))
            return BadRequest("Username already exists.");

        var user = new User
        {
            Id           = Guid.NewGuid().ToString(),
            Username     = req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            FirstName    = req.FirstName,
            LastName     = req.LastName,
            RoleId       = req.RoleId,
            IsActive     = true,
            CreatedDate  = DateTime.UtcNow,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Ok(new UserDto(user.Id, user.Username, user.FirstName, user.LastName, user.RoleId, user.IsActive, user.CreatedDate));
    }

    /// <summary>PATCH /api/admin/users/{id} — update user</summary>
    [HttpPatch("api/admin/users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedDate == null);
        if (user is null) return NotFound();

        user.FirstName = req.FirstName;
        user.LastName  = req.LastName;
        user.RoleId    = req.RoleId;
        user.IsActive  = req.IsActive;

        if (!string.IsNullOrWhiteSpace(req.NewPassword))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);

        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>DELETE /api/admin/users/{id} — soft delete</summary>
    [HttpDelete("api/admin/users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.DeletedDate == null);
        if (user is null) return NotFound();

        user.DeletedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ══════════════════════════════════════════════════════════════════════
    // PRODUCTS
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/products</summary>
    [HttpGet("api/admin/products")]
    public ActionResult<IEnumerable<ProductAdminDto>> ListProducts([FromQuery] string? search = null)
    {
        var query = db.Products
            .Include(p => p.Pricings)
            .Where(p => p.DeletedDate == null);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || p.Code.Contains(search));

        var products = query
            .OrderBy(p => p.Code)
            .Select(p => new ProductAdminDto(
                p.Id, p.Code, p.Name, p.Type, p.Unit ?? string.Empty, p.IsActive,
                p.Pricings.Where(pr => pr.IsActive).Select(pr => pr.PriceNormal).FirstOrDefault()
            ))
            .ToList();

        return Ok(products);
    }

    /// <summary>POST /api/admin/products — create product + pricing</summary>
    [HttpPost("api/admin/products")]
    public async Task<ActionResult<ProductAdminDto>> CreateProduct([FromBody] CreateProductRequest req)
    {
        if (db.Products.Any(p => p.Code == req.Code && p.DeletedDate == null))
            return BadRequest("Product code already exists.");

        var productId = Guid.NewGuid().ToString();
        var product   = new Product
        {
            Id          = productId,
            Code        = req.Code,
            Name        = req.Name,
            Type        = req.Type,
            Unit        = req.Unit,
            IsBillable  = req.IsBillable,
            IsActive    = true,
            CreatedDate = DateTime.UtcNow,
        };

        var pricing = new Pricing
        {
            Id            = Guid.NewGuid().ToString(),
            ProductId     = productId,
            PriceNormal   = req.Price,
            PriceSpecial  = req.Price,
            PriceForeign  = req.Price * 2,
            EffectiveDate = DateOnly.FromDateTime(DateTime.UtcNow),
            IsActive      = true,
            CreatedDate   = DateTime.UtcNow,
        };

        db.Products.Add(product);
        db.Pricings.Add(pricing);
        await db.SaveChangesAsync();

        return Ok(new ProductAdminDto(product.Id, product.Code, product.Name, product.Type, product.Unit ?? string.Empty, product.IsActive, req.Price));
    }

    /// <summary>PATCH /api/admin/products/{id} — update product + price</summary>
    [HttpPatch("api/admin/products/{id}")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] UpdateProductRequest req)
    {
        var product = await db.Products
            .Include(p => p.Pricings)
            .FirstOrDefaultAsync(p => p.Id == id && p.DeletedDate == null);
        if (product is null) return NotFound();

        product.Name     = req.Name;
        product.Unit     = req.Unit;
        product.IsActive = req.IsActive;

        var activePricing = product.Pricings.FirstOrDefault(pr => pr.IsActive);
        if (activePricing is not null)
        {
            activePricing.PriceNormal  = req.Price;
            activePricing.PriceSpecial = req.Price;
            activePricing.PriceForeign = req.Price * 2;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>DELETE /api/admin/products/{id} — soft delete</summary>
    [HttpDelete("api/admin/products/{id}")]
    public async Task<IActionResult> DeleteProduct(string id)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.DeletedDate == null);
        if (product is null) return NotFound();

        product.DeletedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ══════════════════════════════════════════════════════════════════════
    // DIVISIONS
    // ══════════════════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/divisions</summary>
    [HttpGet("api/admin/divisions")]
    public ActionResult<IEnumerable<DivisionDto>> ListDivisions()
    {
        var divs = db.Divisions
            .Where(d => d.DeletedDate == null)
            .OrderBy(d => d.Code)
            .Select(d => new DivisionDto(d.Id, d.Code, d.Name, d.Type, d.IsActive))
            .ToList();
        return Ok(divs);
    }

    /// <summary>POST /api/admin/divisions</summary>
    [HttpPost("api/admin/divisions")]
    public async Task<ActionResult<DivisionDto>> CreateDivision([FromBody] CreateDivisionRequest req)
    {
        if (db.Divisions.Any(d => d.Code == req.Code && d.DeletedDate == null))
            return BadRequest("Division code already exists.");

        var div = new Division
        {
            Id          = Guid.NewGuid().ToString(),
            Code        = req.Code,
            Name        = req.Name,
            Type        = req.Type,
            IsActive    = true,
            CreatedDate = DateTime.UtcNow,
        };

        db.Divisions.Add(div);
        await db.SaveChangesAsync();
        return Ok(new DivisionDto(div.Id, div.Code, div.Name, div.Type, div.IsActive));
    }

    /// <summary>PATCH /api/admin/divisions/{id}</summary>
    [HttpPatch("api/admin/divisions/{id}")]
    public async Task<IActionResult> UpdateDivision(string id, [FromBody] UpdateDivisionRequest req)
    {
        var div = await db.Divisions.FirstOrDefaultAsync(d => d.Id == id && d.DeletedDate == null);
        if (div is null) return NotFound();

        div.Name     = req.Name;
        div.Type     = req.Type;
        div.IsActive = req.IsActive;

        await db.SaveChangesAsync();
        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record UserDto(string Id, string Username, string FirstName, string LastName, string RoleId, bool IsActive, DateTime CreatedDate);
public record CreateUserRequest(string Username, string Password, string FirstName, string LastName, string RoleId);
public record UpdateUserRequest(string FirstName, string LastName, string RoleId, bool IsActive, string? NewPassword);

public record ProductAdminDto(string Id, string Code, string Name, int Type, string Unit, bool IsActive, decimal Price);
public record CreateProductRequest(string Code, string Name, int Type, string Unit, bool IsBillable, decimal Price);
public record UpdateProductRequest(string Name, string Unit, bool IsActive, decimal Price);

public record DivisionDto(string Id, string Code, string Name, int Type, bool IsActive);
public record CreateDivisionRequest(string Code, string Name, int Type);
public record UpdateDivisionRequest(string Name, int Type, bool IsActive);
