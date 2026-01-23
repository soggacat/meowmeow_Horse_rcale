var builder = WebApplication.CreateBuilder(args);

// Добавляем поддержку MVC (Controllers + Views)
builder.Services.AddControllersWithViews();

var app = builder.Build();

// Если не режим разработки — стандартная обработка ошибок
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// HTTPS (можно отключить, если мешает)
app.UseHttpsRedirection();

// Подключение статических файлов (css, js)
app.UseStaticFiles();

// Маршрутизация
app.UseRouting();

// Маршрут по умолчанию — сразу на гонку
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Race}/{action=Index}/{id?}");

app.Run();