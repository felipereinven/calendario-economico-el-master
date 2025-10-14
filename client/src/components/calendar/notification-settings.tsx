import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, BellOff } from "lucide-react";

interface NotificationSettingsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  impactLevels: ("high" | "medium" | "low")[];
  onImpactLevelsChange: (levels: ("high" | "medium" | "low")[]) => void;
  newEventCount?: number;
  onClearBadge?: () => void;
}

export function NotificationSettings({
  enabled,
  onToggle,
  impactLevels,
  onImpactLevelsChange,
  newEventCount = 0,
  onClearBadge,
}: NotificationSettingsProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isOpen, setIsOpen] = useState(false);

  // Check permission when dialog opens and clear badge
  useEffect(() => {
    if ("Notification" in window && isOpen) {
      setPermission(Notification.permission);
      // Clear badge when user opens dialog to acknowledge new events
      if (onClearBadge) {
        onClearBadge();
      }
    }
  }, [isOpen, onClearBadge]);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        onToggle(true);
      }
    }
  };

  const toggleImpactLevel = (level: "high" | "medium" | "low") => {
    if (impactLevels.includes(level)) {
      onImpactLevelsChange(impactLevels.filter((l) => l !== level));
    } else {
      onImpactLevelsChange([...impactLevels, level]);
    }
  };

  const handleToggle = (checked: boolean) => {
    if (checked && permission !== "granted") {
      requestPermission();
    } else {
      onToggle(checked);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
          data-testid="button-notifications-toggle"
        >
          {enabled ? (
            <Bell className="w-4 h-4 mr-2" />
          ) : (
            <BellOff className="w-4 h-4 mr-2" />
          )}
          Alerts
          {newEventCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full" data-testid="badge-new-events">
              {newEventCount > 9 ? '9+' : newEventCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-notifications">
        <DialogHeader>
          <DialogTitle>Event Notifications</DialogTitle>
          <DialogDescription>
            Get notified when new high-impact economic events are detected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable Notifications */}
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications-enabled" className="flex-1">
              <div className="font-medium">Enable Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive browser notifications for new events
              </div>
            </Label>
            <Switch
              id="notifications-enabled"
              checked={enabled && permission === "granted"}
              onCheckedChange={handleToggle}
              disabled={permission === "denied"}
              data-testid="switch-notifications-enabled"
            />
          </div>

          {permission === "denied" && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              Browser notifications are blocked. Please enable them in your browser settings.
            </div>
          )}

          {permission === "default" && !enabled && (
            <div className="p-3 rounded-md bg-muted text-sm">
              Click the toggle above to enable notifications and grant permission.
            </div>
          )}

          {/* Impact Levels */}
          {enabled && permission === "granted" && (
            <div className="space-y-3">
              <Label>Notify for these impact levels:</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="impact-high" className="flex items-center gap-2 cursor-pointer">
                    <Badge
                      variant="outline"
                      className="bg-impact-high/20 text-impact-high border-impact-high/30"
                    >
                      <span className="w-2 h-2 rounded-full bg-impact-high mr-1.5" />
                      High Impact
                    </Badge>
                  </Label>
                  <Switch
                    id="impact-high"
                    checked={impactLevels.includes("high")}
                    onCheckedChange={() => toggleImpactLevel("high")}
                    data-testid="switch-impact-high"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="impact-medium" className="flex items-center gap-2 cursor-pointer">
                    <Badge
                      variant="outline"
                      className="bg-impact-medium/20 text-impact-medium border-impact-medium/30"
                    >
                      <span className="w-2 h-2 rounded-full bg-impact-medium mr-1.5" />
                      Medium Impact
                    </Badge>
                  </Label>
                  <Switch
                    id="impact-medium"
                    checked={impactLevels.includes("medium")}
                    onCheckedChange={() => toggleImpactLevel("medium")}
                    data-testid="switch-impact-medium"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="impact-low" className="flex items-center gap-2 cursor-pointer">
                    <Badge
                      variant="outline"
                      className="bg-impact-low/20 text-impact-low border-impact-low/30"
                    >
                      <span className="w-2 h-2 rounded-full bg-impact-low mr-1.5" />
                      Low Impact
                    </Badge>
                  </Label>
                  <Switch
                    id="impact-low"
                    checked={impactLevels.includes("low")}
                    onCheckedChange={() => toggleImpactLevel("low")}
                    data-testid="switch-impact-low"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
