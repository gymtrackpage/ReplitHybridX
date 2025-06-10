import React, { useState, useEffect } from 'react';
import { WorkoutCard } from '../components/WorkoutCard';

interface User {
  id: string;
  email: string;
}

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

interface Program {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  targetEventWeeks: number;
  category: string;
}

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [todaysWorkouts, setTodaysWorkouts] = useState<Workout[]>([]);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [stats, setStats] = useState({
    completedWorkouts: 0,
    totalWorkouts: 0,
    currentStreak: 0,
    weeklyProgress: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch today's workouts
      const workoutsResponse = await fetch('/api/workouts/today', {
        credentials: 'include'
      });
      if (workoutsResponse.ok) {
        const workouts = await workoutsResponse.json();
        setTodaysWorkouts(workouts);
      }

      // Fetch current program
      const programResponse = await fetch('/api/programs/current', {
        credentials: 'include'
      });
      if (programResponse.ok) {
        const program = await programResponse.json();
        setCurrentProgram(program);
      }

      // Fetch user stats
      const statsResponse = await fetch('/api/users/stats', {
        credentials: 'include'
      });
      if (statsResponse.ok) {
        const userStats = await statsResponse.json();
        setStats(userStats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = (workoutId: number) => {
    console.log('Starting workout:', workoutId);
    // Navigate to workout session
  };

  const handleCompleteWorkout = (workoutId: number) => {
    console.log('Viewing workout results:', workoutId);
    // Navigate to workout results
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #e2e8f0',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingBottom: '80px' // Space for bottom navigation
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px 16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Welcome back, {user.email.split('@')[0]}!
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Ready to crush your HYROX training today?
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#3b82f6'
            }}>
              {stats.currentStreak}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              Day Streak
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#10b981'
            }}>
              {Math.round(stats.weeklyProgress)}%
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              Week Progress
            </div>
          </div>
        </div>

        {/* Current Program */}
        {currentProgram && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}>
                Current Program
              </h2>
              <span style={{
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '12px',
                backgroundColor: '#dbeafe',
                color: '#1e40af'
              }}>
                {currentProgram.difficulty}
              </span>
            </div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              {currentProgram.name}
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {currentProgram.description}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {currentProgram.targetEventWeeks} weeks • {currentProgram.category}
              </span>
              <button style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                View Program
              </button>
            </div>
          </div>
        )}

        {/* Today's Workouts */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px'
          }}>
            Today's Workouts
          </h2>
          
          {todaysWorkouts.length > 0 ? (
            todaysWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onStart={() => handleStartWorkout(workout.id)}
                onComplete={() => handleCompleteWorkout(workout.id)}
              />
            ))
          ) : (
            <div style={{
              backgroundColor: 'white',
              padding: '40px 20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                🎉
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px'
              }}>
                No workouts scheduled
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                You've completed all your workouts for today!
              </p>
              <button style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                Generate Random Workout
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          <button style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            padding: '20px',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              📊
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              View Progress
            </div>
          </button>
          
          <button style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            padding: '20px',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              ⚡
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Quick Workout
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}