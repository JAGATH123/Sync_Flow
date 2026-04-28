
'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileSpreadsheet, TrendingUp, Calculator, DollarSign, Package } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import ManualCostTable from './manual-cost-table';
import { Separator } from './ui/separator';
import type { User } from '@/types';

type ExcelData = (string | number)[][];

interface CostEstimationProps {
  currentUser: User;
}

export default function CostEstimation({ currentUser }: CostEstimationProps) {
  const [data, setData] = useState<ExcelData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isClient = currentUser.role === 'client';
  const isReadOnly = isClient;


  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (isReadOnly) return;
      const file = event.target.files?.[0];
      if (!file) return;

      if (
        !file.type.includes('spreadsheetml') &&
        !file.name.endsWith('.xlsx') &&
        !file.name.endsWith('.xls')
      ) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a valid Excel file (.xlsx, .xls).',
        });
        return;
      }

      setIsLoading(true);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as ExcelData;
          setData(jsonData);
          toast({
            title: 'File Processed',
            description: `Successfully processed "${file.name}".`,
          });
        } catch (error) {
          console.error('Error processing Excel file:', error);
          toast({
            variant: 'destructive',
            title: 'Processing Error',
            description:
              'There was an error processing the Excel file. Please ensure it is not corrupted.',
          });
          setData(null);
          setFileName(null);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    },
    [toast, isReadOnly]
  );

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Gradient Design */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <FileSpreadsheet className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Market Price Dashboard
              </h1>
              <p className="text-emerald-700 dark:text-emerald-300 mt-1">
                Comprehensive pricing management and cost estimation tools for your business
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Enhanced Main Content Card */}
      <Card className="border-2 border-emerald-100 dark:border-emerald-800 shadow-xl bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/10">
        <CardHeader className="border-b border-emerald-100 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <UploadCloud className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-emerald-900 dark:text-emerald-100">Pricing Management</CardTitle>
              <CardDescription className="text-emerald-700 dark:text-emerald-300">
                Add, edit, and manage your market pricing data with advanced cost estimation tools
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <ManualCostTable isReadOnly={isReadOnly} />

          {/* Additional Market Insights */}
          <div className="pt-8 border-t border-emerald-100 dark:border-emerald-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">Market Analysis & Insights</h3>
                <p className="text-purple-700 dark:text-purple-300 text-sm">Advanced pricing analytics and market trends</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Distribution Card */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">Price Distribution</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700 dark:text-purple-300">Budget Range</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100">₹25k - ₹50k</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{width: '35%'}}></div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700 dark:text-purple-300">Premium Range</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100">₹50k - ₹100k</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{width: '65%'}}></div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700 dark:text-purple-300">Enterprise Range</span>
                    <span className="font-semibold text-purple-900 dark:text-purple-100">₹100k+</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{width: '45%'}}></div>
                  </div>
                </div>
              </div>

              {/* Market Trends Card */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Market Trends</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-blue-700 dark:text-blue-300">Web Development</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">+15%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-blue-700 dark:text-blue-300">Design Services</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">+8%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-blue-700 dark:text-blue-300">Marketing</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-600">+3%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-blue-700 dark:text-blue-300">Consulting</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600">-2%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
