import React from 'react';

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  weight?: number;
}

interface Workout {
  id: number;
  name: string;
  description: string;
  duration: number;
  exercises: Exercise[];
  difficulty: string;
  completed?: boolean;
}

interface WorkoutCardProps {
  workout: Workout;
  onStart?: () => void;
  onComplete?: () => void;
}

export function WorkoutCard({ workout, onStart, onComplete }: WorkoutCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            {workout.name}
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '12px',
              backgroundColor: getDifficultyColor(workout.difficulty),
              color: 'white',
              fontWeight: '500'
            }}>
              {workout.difficulty}
            </span>
            <span style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {workout.duration} min
            </span>
          </div>
        </div>
        {workout.completed && (
          <span style={{
            fontSize: '20px',
            color: '#10b981'
          }}>
            ✓
          </span>
        )}
      </div>

      <p style={{
        color: '#6b7280',
        fontSize: '14px',
        marginBottom: '16px',
        lineHeight: '1.5'
      }}>
        {workout.description}
      </p>

      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '8px'
        }}>
          Exercises ({workout.exercises.length})
        </h4>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          {workout.exercises.slice(0, 3).map((exercise, index) => (
            <span
              key={index}
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                borderRadius: '6px'
              }}
            >
              {exercise.name}
            </span>
          ))}
          {workout.exercises.length > 3 && (
            <span style={{
              fontSize: '12px',
              padding: '4px 8px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              borderRadius: '6px'
            }}>
              +{workout.exercises.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px'
      }}>
        {!workout.completed ? (
          <button
            onClick={onStart}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Start Workout
          </button>
        ) : (
          <button
            onClick={onComplete}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            View Results
          </button>
        )}
        <button style={{
          backgroundColor: 'transparent',
          color: '#6b7280',
          border: '1px solid #d1d5db',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer'
        }}>
          View Details
        </button>
      </div>
    </div>
  );
}