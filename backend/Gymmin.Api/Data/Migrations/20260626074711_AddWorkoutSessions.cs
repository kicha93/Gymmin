using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkoutSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkoutSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    ClientSessionId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    SourceWorkoutId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    SourceWorkoutName = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    ExecutionMode = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    FinishedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    AbandonedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ClientUpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    ServerUpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    SessionJson = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_StartedAt",
                table: "WorkoutSessions",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId",
                table: "WorkoutSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_ClientSessionId",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "ClientSessionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_ClientUpdatedAt",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "ClientUpdatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_DeletedAt",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_ServerUpdatedAt",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "ServerUpdatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkoutSessions");
        }
    }
}
