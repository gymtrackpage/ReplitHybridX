# Program Upload Template Guide

## Required File Format

Your CSV or XLSX file must contain these exact column headers:

- **week** (number): Week number (1, 2, 3, etc.)
- **day** (number): Day of week (1-7, where 1=Monday, 7=Sunday)
- **name** (text): Workout name/title
- **description** (text): Detailed workout description
- **duration** (number): Workout duration in minutes
- **exercises** (text): Exercise details (see formats below)

## Exercise Format Options

### Option 1: JSON Array (Recommended)
```json
[{"name": "Push-ups", "sets": 3, "reps": 15}, {"name": "Squats", "sets": 3, "reps": 12}]
```

### Option 2: Simple Text
```text
3 sets of 15 push-ups, 3 sets of 12 squats, 30-second plank hold
```

## Example Rows

| week | day | name | description | duration | exercises |
|------|-----|------|-------------|----------|-----------|
| 1 | 1 | Running Intervals | Warm-up: 10 min easy jog. Main: 6 x 400m at 5K pace | 45 | [{"name": "400m Intervals", "sets": 6, "rest": "90s"}] |
| 1 | 2 | Strength Training | Full body strength workout | 60 | 3 sets of 12 squats, 3 sets of 15 push-ups |

## Important Notes

1. **Required Fields**: All columns are required. Empty cells will cause rows to be skipped.
2. **Week/Day Format**: Use numbers only (week: 1,2,3... day: 1,2,3,4,5,6,7)
3. **Exercise Parsing**: The system accepts both JSON arrays and plain text descriptions
4. **File Types**: Upload .csv or .xlsx files only
5. **Data Validation**: Invalid rows are skipped with console warnings

## Common Issues

- **Missing week/day/name**: These fields are mandatory
- **Invalid JSON**: Use proper JSON format with double quotes
- **Large files**: Keep under 10MB file size limit
- **Special characters**: Avoid special characters in column headers

## Upload Process

1. Fill out the program metadata form (name, description, difficulty, etc.)
2. Select your CSV/XLSX file
3. Click "Upload Program"
4. Check the success message for created workout count
5. Verify the program appears in the admin panel

The template file `program_upload_template.csv` provides a working example you can modify for your programs.