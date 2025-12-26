'use client';

import { createWorkspace } from '@/actions/workspace';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 chars')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric'),
});

export default function CreateWorkspacePage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('slug', data.slug);

    const result = await createWorkspace(null, formData);

    if (result.error) {
      if (typeof result.error === 'string') {
        toast.error(result.error);
      } else {
        // handle field errors
        toast.error('Validation failed');
      }
    } else {
      toast.success('Workspace created');
      router.push(`/${result.slug}`);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a Workspace</CardTitle>
          <CardDescription>
            Get started by creating your first workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Inc."
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-generate slug
                          const slug = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '-');
                          form.setValue('slug', slug);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="acme-inc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Create Workspace
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
