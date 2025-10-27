import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Ban, Shield, AlertTriangle } from "lucide-react";
import { CHAT_LOCALIZATIONS } from '@/utils/chatLocalizations';

interface ChatBlockStatusProps {
  isBlocked: boolean;
  currentUserBlocked: boolean;
  otherUserBlocked: boolean;
  canUnblockOther: boolean;
  otherUserName: string;
  onUnblock?: () => void;
}

export const ChatBlockStatus: React.FC<ChatBlockStatusProps> = ({
  isBlocked,
  currentUserBlocked,
  otherUserBlocked,
  canUnblockOther,
  otherUserName,
  onUnblock
}) => {
  if (!isBlocked) return null;

  if (currentUserBlocked) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <Ban className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-700">
          <div className="flex flex-col gap-2">
            <div>
              <strong>{CHAT_LOCALIZATIONS.YOU_ARE_BLOCKED}</strong>
            </div>
            <div className="text-sm">
              {CHAT_LOCALIZATIONS.YOU_ARE_BLOCKED_DESCRIPTION}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (otherUserBlocked && canUnblockOther) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription className="text-orange-700">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div>
                <strong>{CHAT_LOCALIZATIONS.USER_BLOCKED_WARNING}</strong>
              </div>
              <div className="text-sm">
                {otherUserName} foi bloqueado e não pode enviar mensagens.
              </div>
            </div>
            {onUnblock && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnblock}
                className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <Shield className="h-3 w-3 mr-1" />
                {CHAT_LOCALIZATIONS.UNBLOCK_USER}
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}; 