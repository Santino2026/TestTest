// All 30 teams with fictional names and cities
export const teams = [
  // ========== EASTERN CONFERENCE ==========
  // ATLANTIC DIVISION
  { name: 'Titans', city: 'New York', abbreviation: 'NYT', conference: 'Eastern', division: 'Atlantic', primary_color: '#FF6B35', secondary_color: '#1E3A5F', arena_name: 'Empire Arena', championships: 3 },
  { name: 'Shamrocks', city: 'Boston', abbreviation: 'BOS', conference: 'Eastern', division: 'Atlantic', primary_color: '#00843D', secondary_color: '#FFD700', arena_name: 'Garden Arena', championships: 8 },
  { name: 'Founders', city: 'Philadelphia', abbreviation: 'PHI', conference: 'Eastern', division: 'Atlantic', primary_color: '#003087', secondary_color: '#C4161C', arena_name: 'Liberty Center', championships: 2 },
  { name: 'Dockers', city: 'Baltimore', abbreviation: 'BAL', conference: 'Eastern', division: 'Atlantic', primary_color: '#4B0082', secondary_color: '#CFB53B', arena_name: 'Harbor Pavilion', championships: 1 },
  { name: 'Bridges', city: 'Brooklyn', abbreviation: 'BKN', conference: 'Eastern', division: 'Atlantic', primary_color: '#000000', secondary_color: '#FFFFFF', arena_name: 'Borough Arena', championships: 0 },

  // CENTRAL DIVISION
  { name: 'Windigo', city: 'Chicago', abbreviation: 'CHI', conference: 'Eastern', division: 'Central', primary_color: '#C8102E', secondary_color: '#000000', arena_name: 'Lakeshore Arena', championships: 6 },
  { name: 'Engines', city: 'Detroit', abbreviation: 'DET', conference: 'Eastern', division: 'Central', primary_color: '#4682B4', secondary_color: '#C0C0C0', arena_name: 'Motor City Center', championships: 3 },
  { name: 'Ironworks', city: 'Pittsburgh', abbreviation: 'PIT', conference: 'Eastern', division: 'Central', primary_color: '#FFB81C', secondary_color: '#000000', arena_name: 'Steel City Arena', championships: 1 },
  { name: 'Racers', city: 'Indianapolis', abbreviation: 'IND', conference: 'Eastern', division: 'Central', primary_color: '#002D62', secondary_color: '#FDBB30', arena_name: 'Speedway Center', championships: 0 },
  { name: 'Lumberjacks', city: 'Milwaukee', abbreviation: 'MIL', conference: 'Eastern', division: 'Central', primary_color: '#00471B', secondary_color: '#EEE1C6', arena_name: 'Timber Arena', championships: 2 },

  // SOUTHEAST DIVISION
  { name: 'Riptide', city: 'Miami', abbreviation: 'MIA', conference: 'Eastern', division: 'Southeast', primary_color: '#F9A1BC', secondary_color: '#41B6E6', arena_name: 'South Beach Arena', championships: 3 },
  { name: 'Firebirds', city: 'Atlanta', abbreviation: 'ATL', conference: 'Eastern', division: 'Southeast', primary_color: '#C8102E', secondary_color: '#FDB927', arena_name: 'Peachtree Center', championships: 1 },
  { name: 'Vipers', city: 'Nashville', abbreviation: 'NSH', conference: 'Eastern', division: 'Southeast', primary_color: '#1D1160', secondary_color: '#00788C', arena_name: 'Music City Arena', championships: 0 },
  { name: 'Monuments', city: 'Washington', abbreviation: 'WAS', conference: 'Eastern', division: 'Southeast', primary_color: '#002B5C', secondary_color: '#E31837', arena_name: 'Capital Center', championships: 1 },
  { name: 'Gators', city: 'Orlando', abbreviation: 'ORL', conference: 'Eastern', division: 'Southeast', primary_color: '#0077C0', secondary_color: '#000000', arena_name: 'Swamp Arena', championships: 0 },

  // ========== WESTERN CONFERENCE ==========
  // NORTHWEST DIVISION
  { name: 'Altitude', city: 'Denver', abbreviation: 'DEN', conference: 'Western', division: 'Northwest', primary_color: '#0D2240', secondary_color: '#8B2131', arena_name: 'Mile High Court', championships: 1 },
  { name: 'Glaciers', city: 'Vancouver', abbreviation: 'VAN', conference: 'Western', division: 'Northwest', primary_color: '#A5D8FF', secondary_color: '#FFFFFF', arena_name: 'Pacific Coliseum', championships: 0 },
  { name: 'Pioneers', city: 'Portland', abbreviation: 'POR', conference: 'Western', division: 'Northwest', primary_color: '#E03A3E', secondary_color: '#000000', arena_name: 'Rose Garden', championships: 1 },
  { name: 'Bison', city: 'Kansas City', abbreviation: 'KCB', conference: 'Western', division: 'Northwest', primary_color: '#007AC1', secondary_color: '#EF3B24', arena_name: 'Heartland Arena', championships: 0 },
  { name: 'Summit', city: 'Salt Lake City', abbreviation: 'SLC', conference: 'Western', division: 'Northwest', primary_color: '#002B5C', secondary_color: '#F9A01B', arena_name: 'Mountain Center', championships: 0 },

  // PACIFIC DIVISION
  { name: 'Waves', city: 'Los Angeles', abbreviation: 'LAW', conference: 'Western', division: 'Pacific', primary_color: '#00CED1', secondary_color: '#FFD700', arena_name: 'Pacific Center', championships: 7 },
  { name: 'Rush', city: 'San Francisco', abbreviation: 'SFR', conference: 'Western', division: 'Pacific', primary_color: '#FFD700', secondary_color: '#000000', arena_name: 'Bay Arena', championships: 4 },
  { name: 'Sasquatch', city: 'Seattle', abbreviation: 'SEA', conference: 'Western', division: 'Pacific', primary_color: '#228B22', secondary_color: '#8B4513', arena_name: 'Emerald Court', championships: 1 },
  { name: 'Scorpions', city: 'Phoenix', abbreviation: 'PHX', conference: 'Western', division: 'Pacific', primary_color: '#FF6600', secondary_color: '#000000', arena_name: 'Desert Dome', championships: 0 },
  { name: 'Dealers', city: 'Las Vegas', abbreviation: 'LVD', conference: 'Western', division: 'Pacific', primary_color: '#B4975A', secondary_color: '#000000', arena_name: 'Strip Arena', championships: 1 },

  // SOUTHWEST DIVISION
  { name: 'Stampede', city: 'Dallas', abbreviation: 'DAL', conference: 'Western', division: 'Southwest', primary_color: '#002B5C', secondary_color: '#C0C0C0', arena_name: 'Lone Star Arena', championships: 2 },
  { name: 'Wildcatters', city: 'Houston', abbreviation: 'HOU', conference: 'Western', division: 'Southwest', primary_color: '#FF6600', secondary_color: '#808080', arena_name: 'Energy Center', championships: 2 },
  { name: 'Outlaws', city: 'Austin', abbreviation: 'AUS', conference: 'Western', division: 'Southwest', primary_color: '#BF5700', secondary_color: '#FFFFFF', arena_name: 'Capitol Arena', championships: 0 },
  { name: 'Groove', city: 'Memphis', abbreviation: 'MEM', conference: 'Western', division: 'Southwest', primary_color: '#5D76A9', secondary_color: '#12173F', arena_name: 'Beale Street Arena', championships: 0 },
  { name: 'Krewe', city: 'New Orleans', abbreviation: 'NOR', conference: 'Western', division: 'Southwest', primary_color: '#0C2340', secondary_color: '#C8102E', arena_name: 'Bourbon Arena', championships: 0 },
];
