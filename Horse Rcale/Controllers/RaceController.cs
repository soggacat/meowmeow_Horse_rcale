using Horse_Rcale.Models;
using Microsoft.AspNetCore.Mvc;

namespace CGHR.Controllers
{
    public class RaceController : Controller
    {
        private static List<Horse> _customHorses = new();
        private static int _idCounter = 1;

        private static RaceMode _mode = RaceMode.Random;

        public IActionResult Index()
        {
            var horses = _mode == RaceMode.Random
                ? GenerateRandomHorses()
                : _customHorses;

            return View(horses);
        }

        // ====== –≈∆»Ã€ ======

        public IActionResult SetRandomMode()
        {
            _mode = RaceMode.Random;
            return RedirectToAction("Index");
        }

        public IActionResult SetCustomMode()
        {
            _mode = RaceMode.Custom;
            return RedirectToAction("Index");
        }

        // ====== —Œ«ƒ¿Õ»≈ ÀŒÿ¿ƒ≈… ======

        public IActionResult Create()
        {
            if (_mode != RaceMode.Custom)
                return RedirectToAction("Index");

            return View();
        }

        [HttpPost]
        public IActionResult Create(string name, int speed, int stamina)
        {
            if (_mode != RaceMode.Custom)
                return RedirectToAction("Index");

            _customHorses.Add(new Horse
            {
                Id = _idCounter++,
                Name = name,
                Speed = speed,
                Stamina = stamina
            });

            return RedirectToAction("Index");
        }

        [HttpPost]
        public IActionResult ResetCustom()
        {
            _customHorses.Clear();
            _idCounter = 1;
            return RedirectToAction("Index");
        }

        // ====== ¬—œŒÃŒ√¿“≈À‹ÕŒ≈ ======

        private List<Horse> GenerateRandomHorses()
        {
            var rnd = new Random();
            var list = new List<Horse>();

            var shuffledNames = HorseNames.Names
                .OrderBy(x => rnd.Next())
                .ToList();

            for (int i = 0; i < 4; i++)
            {
                list.Add(new Horse
                {
                    Id = i + 1,
                    Name = shuffledNames[i],
                    Speed = rnd.Next(5, 11),
                    Stamina = rnd.Next(5, 11)
                });
            }

            return list;
        }
    }
}