import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MapPin, Plus, Trash2, Edit2, Loader2, Building } from 'lucide-react';
import { 
  useCompanyLocations, 
  useCreateLocation, 
  useUpdateLocation, 
  useDeleteLocation,
  CompanyLocation 
} from '@/hooks/useCompanyLocations';
import { toast } from 'sonner';

const CompanyLocationsManager = () => {
  const { data: locations = [], isLoading } = useCompanyLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CompanyLocation | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState(100);

  const resetForm = () => {
    setName('');
    setLatitude('');
    setLongitude('');
    setRadius(100);
    setEditingLocation(null);
  };

  const openEditDialog = (location: CompanyLocation) => {
    setEditingLocation(location);
    setName(location.name);
    setLatitude(location.latitude.toString());
    setLongitude(location.longitude.toString());
    setRadius(location.radius_meters);
  };

  const getLocationFromBrowser = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        toast.success('تم تحديد الموقع بنجاح');
      },
      (error) => {
        toast.error('فشل في تحديد الموقع: ' + error.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('يجب إدخال اسم الموقع');
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('إحداثيات الموقع غير صحيحة');
      return;
    }

    if (editingLocation) {
      await updateLocation.mutateAsync({
        id: editingLocation.id,
        name: name.trim(),
        latitude: lat,
        longitude: lng,
        radius_meters: radius,
      });
      setEditingLocation(null);
    } else {
      await createLocation.mutateAsync({
        name: name.trim(),
        latitude: lat,
        longitude: lng,
        radius_meters: radius,
      });
      setIsAddOpen(false);
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteLocation.mutateAsync(id);
  };

  const canAddMore = locations.length < 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          مواقع الشركة
        </CardTitle>
        <CardDescription>
          إدارة مواقع العمل المتعددة (حد أقصى 5 مواقع) - يمكن تعيين موظفين لمواقع محددة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Locations List */}
            {locations.length > 0 ? (
              <div className="space-y-3">
                {locations.map((location, index) => (
                  <div 
                    key={location.id} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{location.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} • نطاق {location.radius_meters}م
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={editingLocation?.id === location.id} onOpenChange={(open) => {
                        if (!open) {
                          resetForm();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditDialog(location)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>تعديل الموقع</DialogTitle>
                            <DialogDescription>
                              تعديل بيانات موقع العمل
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">اسم الموقع</Label>
                              <Input 
                                id="edit-name"
                                placeholder="مثال: المقر الرئيسي"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                              />
                            </div>
                            <div className="grid gap-3 grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="edit-lat">خط العرض</Label>
                                <Input 
                                  id="edit-lat"
                                  type="number"
                                  step="any"
                                  value={latitude}
                                  onChange={(e) => setLatitude(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-lng">خط الطول</Label>
                                <Input 
                                  id="edit-lng"
                                  type="number"
                                  step="any"
                                  value={longitude}
                                  onChange={(e) => setLongitude(e.target.value)}
                                />
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={getLocationFromBrowser}
                              className="w-full"
                            >
                              <MapPin className="w-4 h-4 me-2" />
                              تحديد الموقع الحالي
                            </Button>
                            <div className="space-y-2">
                              <Label htmlFor="edit-radius">نطاق الموقع (متر)</Label>
                              <NumberInput 
                                id="edit-radius"
                                min={10}
                                max={5000}
                                value={radius}
                                onChange={setRadius}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleSubmit}
                              disabled={updateLocation.isPending}
                              className="btn-primary-gradient"
                            >
                              {updateLocation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                              حفظ التغييرات
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الموقع</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف موقع "{location.name}"؟ سيتم إلغاء تعيين جميع الموظفين من هذا الموقع.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(location.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>لم يتم إضافة أي مواقع بعد</p>
                <p className="text-sm">أضف موقع الشركة لتفعيل التحقق من الموقع للموظفين</p>
              </div>
            )}

            {/* Add Location Dialog */}
            <Dialog open={isAddOpen} onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={!canAddMore}
                >
                  <Plus className="w-4 h-4 me-2" />
                  {canAddMore ? 'إضافة موقع جديد' : 'تم الوصول للحد الأقصى (5 مواقع)'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة موقع جديد</DialogTitle>
                  <DialogDescription>
                    أضف موقع عمل جديد للشركة ({locations.length}/5)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">اسم الموقع</Label>
                    <Input 
                      id="add-name"
                      placeholder="مثال: المقر الرئيسي، فرع المعادي..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="add-lat">خط العرض (Latitude)</Label>
                      <Input 
                        id="add-lat"
                        type="number"
                        step="any"
                        placeholder="30.0444"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-lng">خط الطول (Longitude)</Label>
                      <Input 
                        id="add-lng"
                        type="number"
                        step="any"
                        placeholder="31.2357"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={getLocationFromBrowser}
                    className="w-full"
                  >
                    <MapPin className="w-4 h-4 me-2" />
                    تحديد الموقع الحالي تلقائياً
                  </Button>
                  <div className="space-y-2">
                    <Label htmlFor="add-radius">نطاق الموقع (متر)</Label>
                    <NumberInput 
                      id="add-radius"
                      min={10}
                      max={5000}
                      value={radius}
                      onChange={setRadius}
                    />
                    <p className="text-xs text-muted-foreground">
                      الموظف يجب أن يكون داخل {radius} متر من هذا الموقع للتسجيل
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleSubmit}
                    disabled={createLocation.isPending}
                    className="btn-primary-gradient"
                  >
                    {createLocation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                    إضافة الموقع
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Info about location count */}
            <p className="text-xs text-muted-foreground text-center">
              {locations.length}/5 مواقع مستخدمة
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyLocationsManager;
