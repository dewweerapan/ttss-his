FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER app
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["servers/TtssHis.Database.Migrations/TtssHis.Database.Migrations.csproj", "servers/TtssHis.Database.Migrations/"]
COPY ["servers/TtssHis.Shared/TtssHis.Shared.csproj", "servers/TtssHis.Shared/"]
RUN dotnet restore "servers/TtssHis.Database.Migrations/TtssHis.Database.Migrations.csproj"
COPY ["servers/TtssHis.Database.Migrations/", "servers/TtssHis.Database.Migrations/"]
COPY ["servers/TtssHis.Shared/", "servers/TtssHis.Shared/"]
WORKDIR "/src/servers/TtssHis.Database.Migrations"
RUN dotnet build "TtssHis.Database.Migrations.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "TtssHis.Database.Migrations.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "TtssHis.Database.Migrations.dll"]
