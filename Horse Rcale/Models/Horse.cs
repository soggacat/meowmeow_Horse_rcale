namespace Horse_Rcale.Models
{
    public class Horse
    {
            public int Id { get; set; }
            public string Name { get; set; } = "";
            public int Speed { get; set; }
            public int Stamina { get; set; }
            public double Position { get; set; } = 0;
    }
}
