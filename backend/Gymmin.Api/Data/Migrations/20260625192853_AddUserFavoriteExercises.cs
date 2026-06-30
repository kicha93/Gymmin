using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Gymmin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserFavoriteExercises : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserFavoriteExercises",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    ExerciseId = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserFavoriteExercises", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserFavoriteExercises_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteExercises_DeletedAt",
                table: "UserFavoriteExercises",
                column: "DeletedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteExercises_UpdatedAt",
                table: "UserFavoriteExercises",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteExercises_UserId",
                table: "UserFavoriteExercises",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFavoriteExercises_UserId_ExerciseId",
                table: "UserFavoriteExercises",
                columns: new[] { "UserId", "ExerciseId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserFavoriteExercises");
        }
    }
}
