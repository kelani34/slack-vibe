'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateUserPreferences } from '@/actions/user';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  initialPreferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
}

export function NotificationSettings({ initialPreferences }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (key: keyof typeof preferences) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);
    setIsLoading(true);

    try {
      const result = await updateUserPreferences(newPreferences);
      if (result.success) {
        toast.success('Preferences updated');
      } else {
        setPreferences(preferences); // Revert
        toast.error('Failed to update preferences');
      }
    } catch (error) {
       setPreferences(preferences);
       toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Manage how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive emails about activity in your workspace
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.emailNotifications}
            onCheckedChange={() => handleToggle('emailNotifications')}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive push notifications on your device
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={preferences.pushNotifications}
            onCheckedChange={() => handleToggle('pushNotifications')}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
