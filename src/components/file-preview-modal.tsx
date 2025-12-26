'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Download, ExternalLink, X, FileText } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface FilePreviewModalProps {
  url: string | null;
  name?: string;
  type?: string;
  onClose: () => void;
}

export function FilePreviewModal({
  url,
  name,
  type,
  onClose,
}: FilePreviewModalProps) {
  if (!url) return null;

  const isImage =
    type?.startsWith('image/') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = type === 'application/pdf' || url.endsWith('.pdf');

  return (
    <Dialog open={!!url} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden bg-background/95 border-none shadow-2xl flex flex-col">
        <DialogTitle asChild>
          <VisuallyHidden>{name || 'File Preview'}</VisuallyHidden>
        </DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background z-10">
          <div className="flex items-center gap-2 truncate">
            {isPdf ? <FileText className="size-4" /> : null}
            <span className="font-medium truncate max-w-md">
              {name || 'Preview'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={name || 'download'}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <Download className="size-4 mr-2" />
              Download
            </a>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-muted/20">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={name || 'Preview'}
              className="max-h-full max-w-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={`${url}#toolbar=0`}
              className="w-full h-full"
              title={name || 'PDF Preview'}
            />
          ) : (
            <div className="text-center p-8">
              <div className="mb-4">
                <FileText className="size-16 mx-auto text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-2">No preview available</p>
              <p className="text-sm text-muted-foreground mb-4">
                This file type cannot be previewed directly.
              </p>
              <a
                href={url}
                download={name || 'download'}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants()}
              >
                <Download className="size-4 mr-2" />
                Download File
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
