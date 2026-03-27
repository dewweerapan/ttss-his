FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER app
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["servers/TtssHis.Facing/TtssHis.Facing.csproj", "servers/TtssHis.Facing/"]
COPY ["servers/TtssHis.Shared/TtssHis.Shared.csproj", "servers/TtssHis.Shared/"]
RUN dotnet restore "servers/TtssHis.Facing/TtssHis.Facing.csproj"
COPY ["servers/TtssHis.Facing/", "servers/TtssHis.Facing/"]
COPY ["servers/TtssHis.Shared/", "servers/TtssHis.Shared/"]
WORKDIR "/src/servers/TtssHis.Facing"
RUN dotnet build "TtssHis.Facing.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "TtssHis.Facing.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "TtssHis.Facing.dll"]
