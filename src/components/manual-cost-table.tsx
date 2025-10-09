
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, TrendingUp, Package, DollarSign, BarChart3, Calculator, Search, Filter } from 'lucide-react';
import type { CostEstimationItem } from '@/lib/types';

const formSchema = z.object({
  product: z.string().min(1, 'Product name is required.'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
  rangeFrom: z.coerce.number().min(0, 'Range from must be a positive number.'),
  rangeTo: z.coerce.number().min(0, 'Range to must be a positive number.'),
}).refine((data) => data.rangeTo >= data.rangeFrom, {
  message: 'Range to must be greater than or equal to range from.',
  path: ['rangeTo'],
});

type FormValues = z.infer<typeof formSchema>;

const initialData: CostEstimationItem[] = [
    { id: 'item-1', product: 'Marketing Campaign Video', quantity: 1, rangeFrom: 50000, rangeTo: 80000 },
    { id: 'item-2', product: 'Social Media Graphics Pack', quantity: 15, rangeFrom: 25000, rangeTo: 35000 },
    { id: 'item-3', product: 'Website Landing Page Design', quantity: 1, rangeFrom: 40000, rangeTo: 60000 },
];

interface ManualCostTableProps {
  isReadOnly: boolean;
}


export default function ManualCostTable({ isReadOnly }: ManualCostTableProps) {
  const [data, setData] = useState<CostEstimationItem[]>(initialData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<CostEstimationItem | null>(null);
  const [editingItem, setEditingItem] = useState<CostEstimationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'product' | 'quantity' | 'rangeFrom' | 'rangeTo'>('product');
  const { toast } = useToast();

  // Filter and sort data
  const filteredData = data
    .filter(item =>
      item.product.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'product') return a.product.localeCompare(b.product);
      return Number(a[sortBy]) - Number(b[sortBy]);
    });

  // Calculate statistics
  const totalItems = data.length;
  const totalMinValue = data.reduce((sum, item) => sum + (item.rangeFrom * item.quantity), 0);
  const totalMaxValue = data.reduce((sum, item) => sum + (item.rangeTo * item.quantity), 0);
  const avgPriceRange = totalItems > 0 ? (totalMinValue + totalMaxValue) / (2 * totalItems) : 0;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: '',
      quantity: 0,
      rangeFrom: 0,
      rangeTo: 0,
    },
  });

  const handleEditClick = (item: CostEstimationItem) => {
    if (isReadOnly) return;
    setEditingItem(item);
    form.reset({
        product: item.product,
        quantity: item.quantity,
        rangeFrom: item.rangeFrom,
        rangeTo: item.rangeTo,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    if (isReadOnly) return;
    setEditingItem(null);
    form.reset({
        product: '',
        quantity: 0,
        rangeFrom: 0,
        rangeTo: 0,
    });
    setIsDialogOpen(true);
  }

  const handleDelete = () => {
    if (!isDeleting) return;
    setData(data.filter(item => item.id !== isDeleting.id));
    toast({
        title: "Item Deleted",
        description: `"${isDeleting.product}" has been removed from the cost estimation.`,
        variant: "destructive"
    });
    setIsDeleting(null);
  };

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (editingItem) {
      // Update existing item
      setData(data.map(item => item.id === editingItem.id ? { ...item, ...values } : item));
      toast({
        title: "Item Updated",
        description: `Changes to "${values.product}" have been saved.`
      });
    } else {
      // Add new item
      const newItem: CostEstimationItem = {
        id: `item-${Date.now()}`,
        ...values
      };
      setData([...data, newItem]);
      toast({
        title: "Item Added",
        description: `"${values.product}" has been added to the cost estimation.`
      });
    }
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">

      {/* Enhanced Header with Search and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Price Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, or delete cost estimation items with advanced filtering and sorting
          </p>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="🔍 Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/80 dark:bg-gray-950/80 border-2 focus:border-primary/50"
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border-2 rounded-md bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-sm"
          >
            <option value="product">Sort by Product</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="rangeFrom">Sort by Min Price</option>
            <option value="rangeTo">Sort by Max Price</option>
          </select>
        {!isReadOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    editingItem ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}>
                    {editingItem ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                  </div>
                  {editingItem ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
                <p className="text-muted-foreground mt-2">
                  {editingItem ? 'Update the product details and pricing information' : 'Enter product details and set price ranges for cost estimation'}
                </p>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                  <FormField
                    control={form.control}
                    name="product"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold flex items-center gap-2">
                          <Package className="h-4 w-4 text-emerald-600" />
                          Product / Service Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Website Development, Marketing Campaign, Logo Design"
                            className="h-12 border-2 focus:border-emerald-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          Quantity
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter quantity (e.g., 1, 5, 10)"
                            className="h-12 border-2 focus:border-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border">
                    <h4 className="text-base font-semibold flex items-center gap-2 mb-4">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Price Range Configuration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="rangeFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-green-700 dark:text-green-300">
                              Minimum Price (₹)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="50,000"
                                className="h-12 border-2 focus:border-green-500 bg-white dark:bg-gray-950"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="rangeTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-green-700 dark:text-green-300">
                              Maximum Price (₹)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="80,000"
                                className="h-12 border-2 focus:border-green-500 bg-white dark:bg-gray-950"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Price Range Preview */}
                    {form.watch('rangeFrom') > 0 && form.watch('rangeTo') > 0 && (
                      <div className="mt-4 p-3 bg-white dark:bg-gray-950 rounded-lg border">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price Range Preview:</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-600 font-semibold">
                            ₹{Number(form.watch('rangeFrom')).toLocaleString('en-IN')}
                          </span>
                          <div className="flex-1 mx-3 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                          <span className="text-emerald-600 font-semibold">
                            ₹{Number(form.watch('rangeTo')).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-center text-xs text-muted-foreground mt-2">
                          Avg: ₹{((Number(form.watch('rangeFrom')) + Number(form.watch('rangeTo'))) / 2).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="border-t pt-6">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="h-11">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      className={`h-11 px-8 ${
                        editingItem
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                      }`}
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {editingItem ? (
                            <>
                              <Edit className="mr-2 h-4 w-4" />
                              Update Product
                            </>
                          ) : (
                            <>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Product
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Enhanced Table with Better Design */}
      <div className="border-2 border-emerald-100 dark:border-emerald-800 rounded-xl overflow-hidden shadow-lg bg-white dark:bg-gray-900">
        <Table>
          <TableHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
            <TableRow className="border-b-2 border-emerald-100 dark:border-emerald-800">
              <TableHead className="w-[40%] font-semibold text-emerald-900 dark:text-emerald-100">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product / Service
                </div>
              </TableHead>
              <TableHead className="font-semibold text-emerald-900 dark:text-emerald-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Quantity
                </div>
              </TableHead>
              <TableHead className="font-semibold text-emerald-900 dark:text-emerald-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Price Range
                </div>
              </TableHead>
              <TableHead className="font-semibold text-emerald-900 dark:text-emerald-100">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Total Value
                </div>
              </TableHead>
              {!isReadOnly && <TableHead className="text-right w-32 font-semibold text-emerald-900 dark:text-emerald-100">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item, index) => (
              <TableRow
                key={item.id}
                className={`hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors ${
                  index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/30 dark:bg-gray-800/30'
                }`}
              >
                <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full"></div>
                    {item.product}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                      {item.quantity}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ₹{item.rangeFrom.toLocaleString('en-IN')} - ₹{item.rangeTo.toLocaleString('en-IN')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{((item.rangeFrom + item.rangeTo) / 2 * item.quantity).toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      avg total value
                    </div>
                  </div>
                </TableCell>
                {!isReadOnly && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(item)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-700"
                        onClick={() => setIsDeleting(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={isReadOnly ? 4 : 5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Package className="h-12 w-12 text-gray-300" />
                    <div>
                      <p className="font-medium">No products found</p>
                      <p className="text-sm">
                        {searchQuery ? `No results for "${searchQuery}"` : 'Add your first product to get started'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item: "{isDeleting?.product}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
