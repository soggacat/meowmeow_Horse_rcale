
using Horse_Rcale.Models;
using Microsoft.AspNetCore.Mvc;

namespace Horse_Rcale.Controllers
{
    public class RaceController : Controller
    {
        public IActionResult Index()
        {
            var random = new Random();
            var horses = new List<Horse>();

            for (int i = 1; i <= 4; i++)
            {
                horses.Add(new Horse
                {
                    Id = i,
                    Speed = random.Next(5, 11),     // 5–10
                    Stamina = random.Next(5, 11)   // 5–10
                });
            }

            return View(horses);
        }
    }
}