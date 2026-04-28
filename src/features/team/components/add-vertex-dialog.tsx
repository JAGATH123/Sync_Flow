'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface AddVertexDialogProps {
  onVertexAdd: (vertex: string) => void;
}

const vertexSchema = z.object({
  name: z.string().min(1, 'Vertex name is required').max(50, 'Vertex name must be less than 50 characters'),
});

type VertexFormValues = z.infer<typeof vertexSchema>;

export default function AddVertexDialog({ onVertexAdd }: AddVertexDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<VertexFormValues>({
    resolver: zodResolver(vertexSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (values: VertexFormValues) => {
    try {
      setIsLoading(true);

      // Check if vertex already exists
      const existingVertices = JSON.parse(sessionStorage.getItem('vertices') || '[]');
      if (existingVertices.includes(values.name)) {
        toast({
          title: 'Error',
          description: 'Vertex already exists',
          variant: 'destructive',
        });
        return;
      }

      onVertexAdd(values.name);

      toast({
        title: 'Success',
        description: `Vertex "${values.name}" has been added successfully`,
      });

      form.reset();
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add vertex',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start h-8">
          <Plus className="h-3 w-3 mr-2" />
          Add New Vertex
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Vertex</DialogTitle>
          <DialogDescription>
            Add a new vertex to the system. This will be available across all pages.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vertex Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter vertex name..."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Vertex'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}