FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["HealthcareTriage.sln", "."]
COPY ["HealthcareTriage.API/HealthcareTriage.API.csproj", "HealthcareTriage.API/"]
COPY ["HealthcareTriage.Application/HealthcareTriage.Application.csproj", "HealthcareTriage.Application/"]
COPY ["HealthcareTriage.Domain/HealthcareTriage.Domain.csproj", "HealthcareTriage.Domain/"]
COPY ["HealthcareTriage.Infrastructure/HealthcareTriage.Infrastructure.csproj", "HealthcareTriage.Infrastructure/"]
COPY ["HealthcareTriage.Shared/HealthcareTriage.Shared.csproj", "HealthcareTriage.Shared/"]
RUN dotnet restore "HealthcareTriage.sln"

COPY . .
RUN dotnet publish "HealthcareTriage.API/HealthcareTriage.API.csproj" -c Release -o /app/publish --no-restore

FROM runtime AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "HealthcareTriage.API.dll"]
