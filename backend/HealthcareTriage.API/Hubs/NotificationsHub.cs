using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HealthcareTriage.API.Hubs;

[Authorize]
public sealed class NotificationsHub : Hub
{
}
