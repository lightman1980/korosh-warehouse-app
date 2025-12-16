import React, { useState, useEffect } from 'react';
import { Settings, Users, Clock, CheckCircle, AlertCircle, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { DataStorage } from '../../utils/dataStorage';

interface WorkflowStep {
  id: string;
  name: string;
  assignedRole: string;
  timeLimit: number; // in hours
  isRequired: boolean;
  order: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  module: string;
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const modules = [
  { id: 'warehouse-receipt', name: 'رسید انبار' },
  { id: 'warehouse-delivery', name: 'حواله انبار' },
  { id: 'contracts', name: 'قرار داد ها' },
  { id: 'reports', name: 'گزارشات' }
];

const roles = [
  { id: 'admin', name: 'مدیر سیستم' },
  { id: 'warehouse', name: 'کاربر انبار' },
  { id: 'finance', name: 'کاربر مالی' },
  { id: 'planning', name: 'کاربر برنامه‌ریزی' }
];

export const WorkflowManager: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [editingWorkflow, setEditingWorkflow] = useState<string | null>(null);
  const [newWorkflow, setNewWorkflow] = useState<Partial<WorkflowTemplate>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isWorkflowEnabled, setIsWorkflowEnabled] = useState(false);
  const storage = DataStorage.getInstance();

  useEffect(() => {
    const savedWorkflows = storage.loadData('workflows') || [];
    setWorkflows(savedWorkflows);
    
    const settings = storage.loadData('settings') || {};
    setIsWorkflowEnabled(settings.workflowEnabled || false);
  }, []);

  useEffect(() => {
    if (workflows.length > 0) {
      storage.saveData('workflows', workflows);
    }
  }, [workflows]);

  const handleSave = () => {
    if (!newWorkflow.name || !newWorkflow.module) return;

    if (editingWorkflow) {
      setWorkflows(prev => prev.map(w => 
        w.id === editingWorkflow 
          ? { ...w, ...newWorkflow, updatedAt: new Date() } as WorkflowTemplate
          : w
      ));
    } else {
      const newId = `workflow_${Date.now()}`;
      setWorkflows(prev => [...prev, {
        ...newWorkflow,
        id: newId,
        steps: newWorkflow.steps || [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as WorkflowTemplate]);
    }

    setEditingWorkflow(null);
    setIsAddingNew(false);
    setNewWorkflow({});
  };

  const addStep = () => {
    const steps = newWorkflow.steps || [];
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: '',
      assignedRole: '',
      timeLimit: 24,
      isRequired: true,
      order: steps.length + 1
    };
    setNewWorkflow({ ...newWorkflow, steps: [...steps, newStep] });
  };

  const updateStep = (stepId: string, field: keyof WorkflowStep, value: any) => {
    const steps = newWorkflow.steps || [];
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    );
    setNewWorkflow({ ...newWorkflow, steps: updatedSteps });
  };

  const removeStep = (stepId: string) => {
    const steps = newWorkflow.steps || [];
    setNewWorkflow({ ...newWorkflow, steps: steps.filter(s => s.id !== stepId) });
  };

  const toggleWorkflow = () => {
    const newEnabled = !isWorkflowEnabled;
    setIsWorkflowEnabled(newEnabled);
    
    const settings = storage.loadData('settings') || {};
    settings.workflowEnabled = newEnabled;
    storage.saveData('settings', settings);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">مدیریت گردش کار</h1>
            <p className="text-gray-600">تنظیم گردش کار برای ماژول های مختلف سیستم</p>
          </div>
          <div className="flex items-center">
            <img 
              src="/لوگو صنعت غذایی کورش copy.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">قالب های گردش کار</h2>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="workflowEnabled"
                    checked={isWorkflowEnabled}
                    onChange={toggleWorkflow}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="workflowEnabled" className="text-sm text-gray-700">
                    فعال سازی سیستم گردش کار
                  </label>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddingNew(true);
                  setNewWorkflow({ steps: [] });
                }}
                disabled={!isWorkflowEnabled}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                گردش کار جدید
              </button>
            </div>
          </div>

          {(isAddingNew || editingWorkflow) && (
            <div className="p-6 border-b border-gray-200 bg-blue-50">
              <h3 className="font-medium text-blue-900 mb-4">
                {isAddingNew ? 'ایجاد گردش کار جدید' : 'ویرایش گردش کار'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نام گردش کار</label>
                  <input
                    type="text"
                    value={newWorkflow.name || ''}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="نام گردش کار"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ماژول</label>
                  <select
                    value={newWorkflow.module || ''}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, module: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">انتخاب کنید</option>
                    {modules.map(module => (
                      <option key={module.id} value={module.id}>{module.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">مراحل گردش کار</h4>
                  <button
                    onClick={addStep}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    افزودن مرحله
                  </button>
                </div>
                
                <div className="space-y-4">
                  {(newWorkflow.steps || []).map((step, index) => (
                    <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">نام مرحله</label>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder={`مرحله ${index + 1}`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">مسئول</label>
                          <select
                            value={step.assignedRole}
                            onChange={(e) => updateStep(step.id, 'assignedRole', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">انتخاب کنید</option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">مهلت (ساعت)</label>
                          <input
                            type="number"
                            value={step.timeLimit}
                            onChange={(e) => updateStep(step.id, 'timeLimit', parseInt(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={step.isRequired}
                              onChange={(e) => updateStep(step.id, 'isRequired', e.target.checked)}
                              className="ml-1"
                            />
                            الزامی
                          </label>
                          <button
                            onClick={() => removeStep(step.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  ذخیره
                </button>
                <button
                  onClick={() => {
                    setEditingWorkflow(null);
                    setIsAddingNew(false);
                    setNewWorkflow({});
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  انصراف
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نام</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ماژول</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تعداد مراحل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">وضعیت</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workflows.map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{workflow.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {modules.find(m => m.id === workflow.module)?.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{workflow.steps.length}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {workflow.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingWorkflow(workflow.id);
                            setNewWorkflow(workflow);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('آیا از حذف این گردش کار اطمینان دارید؟')) {
                              setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};