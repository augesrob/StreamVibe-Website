import React, { useState, useEffect } from 'react';
import { adminSupabase as supabase } from '@/lib/adminSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Edit, Trash2, GripVertical, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'; // Note: react-beautiful-dnd strict mode issue might occur in React 18, usually solved by disabling strict mode or using a fork. For now we assume standard usage.

// Simple DND Context Wrapper to avoid Strict Mode issues if possible, or just standard usage.
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

const ForumAdministration = () => {
    const { toast } = useToast();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Dialog States
    const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
    const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubforum, setEditingSubforum] = useState(null);
    const [selectedParentId, setSelectedParentId] = useState(null); // For subforum creation

    // Delete Confirmation State
    const [deleteDialogState, setDeleteDialogState] = useState({ open: false, type: null, id: null });

    // Forms
    const [catForm, setCatForm] = useState({ name: '', description: '', icon: 'Hash', order: 0 });
    const [subForm, setSubForm] = useState({ name: '', description: '', icon: 'MessageSquare', category_id: '', order: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('forum_categories')
            .select(`
                *,
                forum_subforums (
                    *
                )
            `)
            .order('order', { ascending: true });
            
        if (data) {
            // Sort subforums manually since nested orderby is tricky in one query sometimes
            const sortedData = data.map(c => ({
                ...c,
                forum_subforums: c.forum_subforums.sort((a, b) => a.order - b.order)
            }));
            setCategories(sortedData);
        }
        if (error) toast({ variant: "destructive", title: "Error", description: error.message });
        setLoading(false);
    };

    // --- Category Handlers ---
    const handleSaveCategory = async () => {
        if (!catForm.name) return toast({ variant: "destructive", title: "Name required" });
        
        let error;
        if (editingCategory) {
            ({ error } = await supabase.from('forum_categories').update(catForm).eq('id', editingCategory.id));
        } else {
            // Get max order
            const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) + 1 : 0;
            ({ error } = await supabase.from('forum_categories').insert({ ...catForm, order: maxOrder }));
        }

        if (error) toast({ variant: "destructive", title: "Error", description: error.message });
        else {
            toast({ title: "Success", description: "Category saved" });
            setIsCatDialogOpen(false);
            fetchData();
        }
    };

    const handleDeleteCategory = (id) => {
        setDeleteDialogState({ open: true, type: 'category', id });
    };

    // --- Subforum Handlers ---
    const handleSaveSubforum = async () => {
        if (!subForm.name || !subForm.category_id) return toast({ variant: "destructive", title: "Name and Parent Category required" });
        
        let error;
        if (editingSubforum) {
            ({ error } = await supabase.from('forum_subforums').update(subForm).eq('id', editingSubforum.id));
        } else {
            const parentCat = categories.find(c => c.id === subForm.category_id);
            const maxOrder = parentCat && parentCat.forum_subforums.length > 0 
                ? Math.max(...parentCat.forum_subforums.map(s => s.order)) + 1 
                : 0;
            ({ error } = await supabase.from('forum_subforums').insert({ ...subForm, order: maxOrder }));
        }

        if (error) toast({ variant: "destructive", title: "Error", description: error.message });
        else {
            toast({ title: "Success", description: "Subforum saved" });
            setIsSubDialogOpen(false);
            fetchData();
        }
    };

    const handleDeleteSubforum = (id) => {
        setDeleteDialogState({ open: true, type: 'subforum', id });
    };

    const confirmDelete = async () => {
        const { type, id } = deleteDialogState;
        if (!type || !id) return;

        let error;
        if (type === 'category') {
             ({ error } = await supabase.from('forum_categories').delete().eq('id', id));
        } else if (type === 'subforum') {
             ({ error } = await supabase.from('forum_subforums').delete().eq('id', id));
        }

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Deleted", description: `${type === 'category' ? 'Category' : 'Subforum'} deleted` });
            fetchData();
        }
        setDeleteDialogState({ open: false, type: null, id: null });
    };

    // --- DND Handlers ---
    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const { source, destination, type } = result;

        if (type === 'CATEGORY') {
            const items = Array.from(categories);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            setCategories(items); // Optimistic update

            // Update all orders in DB
            const updates = items.map((item, index) => ({
                id: item.id,
                order: index,
                name: item.name, // Required for upsert sometimes depending on RLS/Constraints, usually just ID/order is enough if patch
                updated_at: new Date() 
            }));

            // Supabase doesn't support bulk update with different values easily in one query without upsert
            // For small number of categories, loop update is fine or use upsert
            for (const item of updates) {
                await supabase.from('forum_categories').update({ order: item.order }).eq('id', item.id);
            }
        } 
        
        if (type === 'SUBFORUM') {
            const sourceCatId = source.droppableId;
            const destCatId = destination.droppableId;
            
            // We only support reordering within same category for simplicity in UI, 
            // but moving between categories is possible if we implement it.
            // Assuming simplified reorder within category for now based on UI structure.
            if (sourceCatId !== destCatId) return;

            const categoryIndex = categories.findIndex(c => c.id === sourceCatId);
            const category = categories[categoryIndex];
            const items = Array.from(category.forum_subforums);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);

            const newCategories = [...categories];
            newCategories[categoryIndex] = { ...category, forum_subforums: items };
            setCategories(newCategories);

            // Update DB
            for (let i = 0; i < items.length; i++) {
                await supabase.from('forum_subforums').update({ order: i }).eq('id', items[i].id);
            }
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-[#1a1a24] border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Structure Management</CardTitle>
                        <CardDescription>Drag and drop to reorder. Manage categories and subforums.</CardDescription>
                    </div>
                    <Button onClick={() => { 
                        setEditingCategory(null); 
                        setCatForm({ name: '', description: '', icon: 'Hash', order: 0 }); 
                        setIsCatDialogOpen(true); 
                    }} className="bg-cyan-600 hover:bg-cyan-700">
                        <Plus className="w-4 h-4 mr-2" /> New Category
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? <Loader2 className="animate-spin mx-auto text-cyan-500" /> : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <StrictModeDroppable droppableId="categories" type="CATEGORY">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                        {categories.map((category, index) => (
                                            <Draggable key={category.id} draggableId={category.id} index={index}>
                                                {(provided) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} className="border border-gray-800 rounded-lg bg-[#12121a] overflow-hidden">
                                                        {/* Category Header */}
                                                        <div className="flex items-center p-3 bg-gray-900/50 border-b border-gray-800">
                                                            <div {...provided.dragHandleProps} className="p-2 cursor-grab text-gray-500 hover:text-white">
                                                                <GripVertical className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 ml-2">
                                                                <h3 className="font-bold text-lg text-white">{category.name}</h3>
                                                                <p className="text-xs text-gray-500">{category.description}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="xs" variant="outline" onClick={() => {
                                                                    setEditingSubforum(null);
                                                                    setSubForm({ name: '', description: '', icon: 'MessageSquare', category_id: category.id, order: 0 });
                                                                    setIsSubDialogOpen(true);
                                                                }}>
                                                                    <Plus className="w-3 h-3 mr-1" /> Add Subforum
                                                                </Button>
                                                                <Button size="xs" variant="ghost" onClick={() => {
                                                                    setEditingCategory(category);
                                                                    setCatForm(category);
                                                                    setIsCatDialogOpen(true);
                                                                }}><Edit className="w-4 h-4 text-blue-400" /></Button>
                                                                <Button size="xs" variant="ghost" onClick={() => handleDeleteCategory(category.id)}>
                                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Subforums List */}
                                                        <StrictModeDroppable droppableId={category.id} type="SUBFORUM">
                                                            {(provided) => (
                                                                <div {...provided.droppableProps} ref={provided.innerRef} className="p-3 space-y-2">
                                                                    {category.forum_subforums.length === 0 && (
                                                                        <div className="text-center text-xs text-gray-600 py-2 italic">No subforums. Add one above.</div>
                                                                    )}
                                                                    {category.forum_subforums.map((sub, sIndex) => (
                                                                        <Draggable key={sub.id} draggableId={sub.id} index={sIndex}>
                                                                            {(provided) => (
                                                                                <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center p-2 bg-[#1a1a24] rounded border border-gray-800/50 hover:border-gray-700">
                                                                                    <div {...provided.dragHandleProps} className="mr-3 cursor-grab text-gray-600 hover:text-gray-400">
                                                                                        <GripVertical className="w-4 h-4" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="text-sm font-medium text-gray-200">{sub.name}</div>
                                                                                        <div className="text-xs text-gray-500">{sub.description}</div>
                                                                                    </div>
                                                                                    <div className="flex gap-1">
                                                                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                                                                            setEditingSubforum(sub);
                                                                                            setSubForm(sub);
                                                                                            setIsSubDialogOpen(true);
                                                                                        }}><Edit className="w-3 h-3 text-blue-400" /></Button>
                                                                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteSubforum(sub.id)}>
                                                                                            <Trash2 className="w-3 h-3 text-red-400" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}
                                                                </div>
                                                            )}
                                                        </StrictModeDroppable>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </StrictModeDroppable>
                        </DragDropContext>
                    )}
                </CardContent>
            </Card>

            {/* Category Dialog */}
            <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <DialogHeader><DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2"><Label>Name</Label><Input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="bg-[#12121a] border-gray-700" /></div>
                        <div className="space-y-2"><Label>Description</Label><Input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} className="bg-[#12121a] border-gray-700" /></div>
                    </div>
                    <DialogFooter><Button onClick={handleSaveCategory} className="bg-cyan-600">Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Subforum Dialog */}
            <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
                <DialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <DialogHeader><DialogTitle>{editingSubforum ? 'Edit Subforum' : 'New Subforum'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2"><Label>Parent Category</Label>
                            <Select value={subForm.category_id} onValueChange={v => setSubForm({...subForm, category_id: v})}>
                                <SelectTrigger className="bg-[#12121a] border-gray-700"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] text-white border-gray-800">
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label>Name</Label><Input value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} className="bg-[#12121a] border-gray-700" /></div>
                        <div className="space-y-2"><Label>Description</Label><Input value={subForm.description} onChange={e => setSubForm({...subForm, description: e.target.value})} className="bg-[#12121a] border-gray-700" /></div>
                    </div>
                    <DialogFooter><Button onClick={handleSaveSubforum} className="bg-cyan-600">Save</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogState.open} onOpenChange={(open) => !open && setDeleteDialogState(prev => ({ ...prev, open: false }))}>
                <AlertDialogContent className="bg-[#1a1a24] border-gray-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            {deleteDialogState.type === 'category' 
                                ? "This will permanently delete the category and all its subforums." 
                                : "This will permanently delete the subforum and all its threads."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-gray-700 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-none">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ForumAdministration;