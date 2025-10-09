'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface DeleteVertexDialogProps {
  vertexToDelete: string;
  onVertexDelete: (vertex: string) => void;
}

export default function DeleteVertexDialog({ vertexToDelete, onVertexDelete }: DeleteVertexDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      // Check if vertex is in use by any tasks
      const storedTasks = sessionStorage.getItem('tasks');
      const tasks = storedTasks ? JSON.parse(storedTasks) : [];
      const tasksUsingVertex = tasks.filter((task: any) => task.vertex === vertexToDelete);

      if (tasksUsingVertex.length > 0) {
        toast({
          title: 'Cannot Delete Vertex',
          description: `This vertex is currently used by ${tasksUsingVertex.length} task(s). Please reassign or delete those tasks first.`,
          variant: 'destructive',
        });
        return;
      }

      onVertexDelete(vertexToDelete);

      toast({
        title: 'Success',
        description: `Vertex "${vertexToDelete}" has been deleted successfully`,
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete vertex',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vertex</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the vertex "{vertexToDelete}"? This action cannot be undone.
            All tasks using this vertex will need to be reassigned.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Vertex'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}