-- ==============================================================================
-- مشروع: نظام إدارة وتأجير الحاويات - "المحترز للحاويات"
-- ملف قاعدة البيانات وسياسات الأمان المعدل (Supabase Schema with Safe Idempotent RLS)
-- ==============================================================================

-- تفعيل إضافات PostgreSQL الأساسية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. دالة تحديث حقل updated_at تلقائياً عند أي تعديل
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. جدول profiles (المستخدمون: المدير والموظفون وتوزيع الصلاحيات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,                                     -- اسم الموظف / المدير
    email TEXT UNIQUE NOT NULL,                                  -- البريد الإلكتروني
    phone TEXT,                                                  -- رقم الجوال
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')), -- الصلاحية: مدير أو موظف
    password_pin TEXT DEFAULT '1234',                            -- كلمة المرور / الرمز السري المحدد من قبل المدير
    is_active BOOLEAN NOT NULL DEFAULT true,                     -- حالة الحساب (نشط / موقوف)
    can_view_all_records BOOLEAN NOT NULL DEFAULT true,          -- هل يرى كافة العقود أم العقود التي أدخلها فقط
    notes TEXT,                                                  -- ملاحظات إضافية
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ترقية الأعمدة لضمان وجود حقل password_pin
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_pin TEXT DEFAULT '1234';

COMMENT ON TABLE public.profiles IS 'جدول الموظفين والإدارة وتحديد الصلاحيات وحالة الحسابات';

-- زناد تحديث updated_at لجدول profiles
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 3. دالة إضافة المستخدم في profiles تلقائياً عند إنشائه في Supabase Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. جدول containers (الحاويات: نوعان فقط - تجاري أو أنقاض بدون مقاسات)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.containers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_number TEXT UNIQUE NOT NULL,                       -- رقم الحاوية الفريد (مثال: C-101 أو D-201)
    type TEXT NOT NULL CHECK (type IN ('commercial', 'debris')), -- نوع الحاوية: تجاري أو أنقاض فقط
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')), -- الحالة: متاحة، مؤجرة، في الصيانة
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,             -- سعر الإيجار اليومي
    monthly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,           -- سعر الإيجار الشهري
    notes TEXT,                                                  -- ملاحظات حول الحاوية
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.containers IS 'جدول الحاويات (تجاري / أنقاض) وحالتها التشغيلية وأسعارها';

DROP TRIGGER IF EXISTS tr_containers_updated_at ON public.containers;
CREATE TRIGGER tr_containers_updated_at
    BEFORE UPDATE ON public.containers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. جدول customers (بيانات العملاء)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                                          -- اسم العميل أو المؤسسة
    phone TEXT NOT NULL,                                         -- رقم الجوال مع كود الدولة للواتساب (مثال: +966500000000)
    alt_phone TEXT,                                              -- رقم بديل
    customer_type TEXT NOT NULL DEFAULT 'individual' CHECK (customer_type IN ('individual', 'company')), -- فرد أو شركة
    address TEXT,                                                -- العنوان التقريبي
    notes TEXT,                                                  -- ملاحظات العميل
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.customers IS 'جدول بيانات العملاء وأرقام الاتصال والتواصل';

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

DROP TRIGGER IF EXISTS tr_customers_updated_at ON public.customers;
CREATE TRIGGER tr_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. جدول contracts (العقود: نوع العقد، المدة، الموقع الجغرافي، التكلفة والموظف)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT UNIQUE NOT NULL,                        -- رقم العقد المميز (مثال: CTR-2026-001)
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    container_id UUID REFERENCES public.containers(id) ON DELETE SET NULL,
    
    -- نوع وفترة العقد
    contract_type TEXT NOT NULL CHECK (contract_type IN ('commercial', 'debris')), -- تجاري أو أنقاض
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'monthly', 'semi_annual', 'annual')), -- يومي، شهري، نصف سنوي، سنوي
    duration_days INTEGER DEFAULT 1,                             -- عدد الأيام في العقود اليومية
    
    -- التواريخ والمواعيد
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),               -- تاريخ ووقت بداية العقد والتنزيل
    end_date TIMESTAMPTZ NOT NULL,                              -- تاريخ ووقت نهاية العقد
    expected_pickup_time TIMESTAMPTZ,                            -- تاريخ ووقت السحب المتوقع (خاص بعقود الأنقاض)
    
    -- الموقع الجغرافي
    location_latitude DOUBLE PRECISION,                          -- خط العرض عبر GPS
    location_longitude DOUBLE PRECISION,                         -- خط الطول عبر GPS
    google_maps_url TEXT,                                        -- رابط خرائط جوجل المباشر
    location_address TEXT,                                       -- وصف الموقع أو الحي
    
    -- التكلفة والماليات
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,             -- تكلفة العقد الإجمالية
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,            -- المبلغ المدفوع
    remaining_amount NUMERIC(10, 2) GENERATED ALWAYS AS (total_cost - paid_amount) STORED, -- المتبقي المحسوب تلقائياً
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
    
    -- حالة العقد
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'extended')),
    
    -- الموظفون المرتبطون
    created_by_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- الموظف مدخل العقد
    assigned_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,   -- الموظف المسؤول عن المتابعة
    
    notes TEXT,                                                  -- ملاحظات وشروط العقد
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contracts IS 'جدول العقود وتفاصيل الحجز والتواريخ والمواقع والتكاليف';

CREATE INDEX IF NOT EXISTS idx_contracts_customer ON public.contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_container ON public.contracts(container_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON public.contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_pickup ON public.contracts(expected_pickup_time);

DROP TRIGGER IF EXISTS tr_contracts_updated_at ON public.contracts;
CREATE TRIGGER tr_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. دالة وزناد مزامنة حالة الحاوية تلقائياً عند إنشاء/تحديث العقد
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_container_status_on_contract()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.status = 'active' AND NEW.container_id IS NOT NULL THEN
            UPDATE public.containers 
            SET status = 'rented' 
            WHERE id = NEW.container_id;
        ELSIF NEW.status IN ('completed', 'cancelled') AND NEW.container_id IS NOT NULL THEN
            UPDATE public.containers 
            SET status = 'available' 
            WHERE id = NEW.container_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_container_status ON public.contracts;
CREATE TRIGGER tr_sync_container_status
    AFTER INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_container_status_on_contract();

-- ==============================================================================
-- 8. جدول notification_logs (محرك وسجل تنبيهات الواتساب المجدولة والمرسلة)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('customer', 'employee', 'admin')), -- الطرف المستلم: عميل / موظف / مدير
    recipient_phone TEXT NOT NULL,                               -- رقم جوال المستلم بصيغة الواتساب
    recipient_name TEXT,                                         -- اسم المستلم
    
    -- نوع الإشعار التلقائي
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'debris_pickup_4h',      -- إشعار قبل 4-6 ساعات لانتهاء عقد الأنقاض (للسحب أو التمديد)
        'commercial_7d_before',  -- إشعار تجاري أول قبل 7 أيام من انتهاء العقد
        'commercial_2d_before',  -- إشعار تجاري ثانٍ قبل يومين لتأكيد التجديد وتجهيز الفاتورة
        'contract_created',      -- إشعار توثيق العقد للعميل والموظف فور إنشائه
        'custom_alert'           -- تنبيه مخصص يدوي
    )),
    
    message_body TEXT NOT NULL,                                  -- نص الرسالة المرسلة
    scheduled_for TIMESTAMPTZ NOT NULL,                          -- موعد الإرسال المجدول
    sent_at TIMESTAMPTZ,                                         -- وقت الإرسال الفعلي
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')), -- حالة الإرسال
    error_message TEXT,                                          -- رسالة الخطأ إن وجدت
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notification_logs IS 'سجل ومحرك جدولة إشعارات الواتساب للعقود اليومية والتجارية';

CREATE INDEX IF NOT EXISTS idx_notifications_contract ON public.notification_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notification_logs(scheduled_for, status);

-- ==============================================================================
-- 9. دالة لتوليد رسائل وتنبيهات الواتساب تلقائياً عند إنشاء العقد
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.schedule_contract_whatsapp_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name TEXT;
    v_customer_phone TEXT;
    v_container_num TEXT;
    v_emp_phone TEXT;
    v_emp_name TEXT;
    v_admin_phone TEXT;
BEGIN
    SELECT name, phone INTO v_customer_name, v_customer_phone 
    FROM public.customers WHERE id = NEW.customer_id;
    
    SELECT container_number INTO v_container_num 
    FROM public.containers WHERE id = NEW.container_id;

    IF NEW.assigned_employee_id IS NOT NULL THEN
        SELECT full_name, phone INTO v_emp_name, v_emp_phone 
        FROM public.profiles WHERE id = NEW.assigned_employee_id;
    END IF;

    -- إشعار توثيق العقد
    IF v_customer_phone IS NOT NULL THEN
        INSERT INTO public.notification_logs (
            contract_id, customer_id, recipient_role, recipient_phone, recipient_name,
            notification_type, message_body, scheduled_for, status
        ) VALUES (
            NEW.id, NEW.customer_id, 'customer', v_customer_phone, v_customer_name,
            'contract_created',
            'مرحباً ' || COALESCE(v_customer_name, 'عزيزنا العميل') || '، تم توثيق عقدك رقم (' || NEW.contract_number || ') بنجاح لدى المحترز للحاويات. رقم الحاوية: ' || COALESCE(v_container_num, '-') || '. شكراً لثقتكم بنا.',
            NOW(), 'pending'
        );
    END IF;

    -- عقود الأنقاض (تنبيه قبل 4 ساعات)
    IF NEW.contract_type = 'debris' THEN
        DECLARE
            v_pickup_time TIMESTAMPTZ := COALESCE(NEW.expected_pickup_time, NEW.end_date);
            v_remind_time TIMESTAMPTZ := v_pickup_time - INTERVAL '4 hours';
        BEGIN
            IF v_customer_phone IS NOT NULL AND v_remind_time > NOW() THEN
                INSERT INTO public.notification_logs (
                    contract_id, customer_id, recipient_role, recipient_phone, recipient_name,
                    notification_type, message_body, scheduled_for, status
                ) VALUES (
                    NEW.id, NEW.customer_id, 'customer', v_customer_phone, v_customer_name,
                    'debris_pickup_4h',
                    'عزيزنا ' || COALESCE(v_customer_name, 'العميل') || '، نود تذكيركم بقرب موعد سحب حاوية الأنقاض رقم (' || COALESCE(v_container_num, '-') || ') خلال 4 ساعات. في حال رغبتكم بالتمديد يرجى التواصل معنا.',
                    v_remind_time, 'pending'
                );
            END IF;

            IF v_emp_phone IS NOT NULL AND v_remind_time > NOW() THEN
                INSERT INTO public.notification_logs (
                    contract_id, customer_id, recipient_role, recipient_phone, recipient_name,
                    notification_type, message_body, scheduled_for, status
                ) VALUES (
                    NEW.id, NEW.customer_id, 'employee', v_emp_phone, v_emp_name,
                    'debris_pickup_4h',
                    'تنبيه تشغيلي: يرجى تجهيز السائق لسحب حاوية الأنقاض (' || COALESCE(v_container_num, '-') || ') للعميل ' || COALESCE(v_customer_name, '-') || ' خلال 4 ساعات.',
                    v_remind_time, 'pending'
                );
            END IF;
        END;

    -- العقود التجارية (قبل 7 أيام وقبل يومين)
    ELSIF NEW.contract_type = 'commercial' THEN
        DECLARE
            v_7d_time TIMESTAMPTZ := NEW.end_date - INTERVAL '7 days';
            v_2d_time TIMESTAMPTZ := NEW.end_date - INTERVAL '2 days';
        BEGIN
            IF v_customer_phone IS NOT NULL AND v_7d_time > NOW() THEN
                INSERT INTO public.notification_logs (
                    contract_id, customer_id, recipient_role, recipient_phone, recipient_name,
                    notification_type, message_body, scheduled_for, status
                ) VALUES (
                    NEW.id, NEW.customer_id, 'customer', v_customer_phone, v_customer_name,
                    'commercial_7d_before',
                    'عزيزنا ' || COALESCE(v_customer_name, 'العميل') || '، نود إحاطتكم بأن عقد الحاوية التجارية رقم (' || NEW.contract_number || ') سينتهي بعد 7 أيام. للتجديد يرجى التواصل معنا لتجهيز الفاتورة.',
                    v_7d_time, 'pending'
                );
            END IF;

            IF v_customer_phone IS NOT NULL AND v_2d_time > NOW() THEN
                INSERT INTO public.notification_logs (
                    contract_id, customer_id, recipient_role, recipient_phone, recipient_name,
                    notification_type, message_body, scheduled_for, status
                ) VALUES (
                    NEW.id, NEW.customer_id, 'customer', v_customer_phone, v_customer_name,
                    'commercial_2d_before',
                    'تذكير نهائي: يتبقى يومان على انتهاء عقد الحاوية التجاري (' || NEW.contract_number || '). نرجو تأكيد رغبتكم في التجديد وإصدار الفاتورة.',
                    v_2d_time, 'pending'
                );
            END IF;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_schedule_contract_whatsapp ON public.contracts;
CREATE TRIGGER tr_schedule_contract_whatsapp
    AFTER INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.schedule_contract_whatsapp_notifications();

-- ==============================================================================
-- 10. جدول notifications (نظام الإشعارات والتنبيهات الداخلية في التطبيق In-App)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- الموظف المستهدف (أو NULL إذا كان إشعاراً عاماً للمدراء وكافة الفريق)
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                                         -- عنوان التنبيه (مثال: موعد سحب وشيك، عقد جديد)
    message TEXT NOT NULL,                                       -- نص التنبيه التفصيلي
    type TEXT NOT NULL CHECK (type IN (
        'contract_expiry_soon',      -- تنبيه بقرب موعد انتهاء وسحب الحاوية
        'contract_created',          -- إشعار تسجيل عقد جديد
        'container_status_change',   -- إشعار بتغيير حالة الحاوية (صيانة، تأجير)
        'payment_alert',             -- إشعار سداد أو مبالغ متبقية
        'system_alert'               -- تنبيه عام من النظام أو الإدارة
    )),
    is_read BOOLEAN NOT NULL DEFAULT false,                      -- حالة القراءة
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'جدول الإشعارات والتنبيهات الداخلية في التطبيق مع جرس الإشعارات';

CREATE INDEX IF NOT EXISTS idx_inapp_notifs_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_inapp_notifs_created ON public.notifications(created_at DESC);

-- زناد لإصدار إشعار داخلي فوري للمدير والموظف عند تسجيل أي عقد جديد
CREATE OR REPLACE FUNCTION public.trigger_inapp_notification_on_contract()
RETURNS TRIGGER AS $$
DECLARE
    v_cust_name TEXT;
    v_cont_num TEXT;
BEGIN
    SELECT name INTO v_cust_name FROM public.customers WHERE id = NEW.customer_id;
    SELECT container_number INTO v_cont_num FROM public.containers WHERE id = NEW.container_id;

    -- إشعار تسجيل العقد الجديد
    INSERT INTO public.notifications (
        user_id, contract_id, title, message, type, is_read
    ) VALUES (
        NEW.assigned_employee_id,
        NEW.id,
        '📝 تم توثيق عقد جديد (' || NEW.contract_number || ')',
        'تم تسجيل عقد جديد للعميل ' || COALESCE(v_cust_name, 'عميل') || ' بالحاوية (' || COALESCE(v_cont_num, '-') || ').',
        'contract_created',
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_inapp_notif_contract ON public.contracts;
CREATE TRIGGER tr_inapp_notif_contract
    AFTER INSERT ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_inapp_notification_on_contract();

-- ==============================================================================
-- 12. جدول payment_settings (إعدادات بوابة الدفع الإلكتروني Moyasar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN NOT NULL DEFAULT true,                    -- تفعيل أو تعطيل بوابة الدفع الإلكتروني
    publishable_key TEXT DEFAULT 'pk_test_muhtaraz_demo_key',    -- المفتاح العام
    secret_key TEXT DEFAULT 'sk_test_muhtaraz_secret_key',       -- المفتاح السري
    apple_pay_enabled BOOLEAN NOT NULL DEFAULT true,             -- تفعيل خيار Apple Pay
    mada_enabled BOOLEAN NOT NULL DEFAULT true,                  -- تفعيل خيار مدى
    credit_card_enabled BOOLEAN NOT NULL DEFAULT true,           -- تفعيل البطاقات الائتمانية
    vat_number TEXT DEFAULT '300099887700003',                   -- الرقم الضريبي للمنشأة
    company_commercial_reg TEXT DEFAULT '1010889900',            -- السجل التجاري
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_settings IS 'جدول إعدادات ومفاتيح بوابة الدفع الإلكتروني Moyasar';

DROP TRIGGER IF EXISTS tr_payment_settings_updated_at ON public.payment_settings;
CREATE TRIGGER tr_payment_settings_updated_at
    BEFORE UPDATE ON public.payment_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 13. جدول receipts (سندات القبض المالية الموثقة)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,                        -- رقم السند (مثال: RCP-2026-001)
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,                              -- المبلغ المقبوض
    payment_method TEXT NOT NULL CHECK (payment_method IN (
        'apple_pay', 'mada', 'credit_card', 'cash', 'pos', 'bank_transfer'
    )),                                                          -- طريقة الدفع
    transaction_ref TEXT,                                        -- الرقم المرجعي للعملية الإلكترونية أو البنكية
    received_by_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- الموظف/السائق المستلم
    notes TEXT,                                                  -- ملاحظات السند
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.receipts IS 'جدول سندات القبض الإلكترونية والنقدية الموثقة مع رمز التحقق QR';

CREATE INDEX IF NOT EXISTS idx_receipts_contract ON public.receipts(contract_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer ON public.receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_number ON public.receipts(receipt_number);

-- ==============================================================================
-- 14. سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
-- تم استخدام DROP POLICY IF EXISTS قبل كل سياسة لضمان قابلية إعادة التنفيذ دون أخطاء
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- دالة مساعدة لمعرفة هل المستخدم الحالي مدير (Admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة مساعدة لمعرفة هل المستخدم الحالي موظف نشط
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- سياسات جدول profiles (المستخدمون والموظفون)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full control on profiles" ON public.profiles;
CREATE POLICY "Admins full control on profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view profiles" ON public.profiles;
CREATE POLICY "Staff can view profiles"
    ON public.profiles FOR SELECT
    USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can update own profile" ON public.profiles;
CREATE POLICY "Staff can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id AND public.is_active_staff())
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- سياسات جدول containers (الحاويات)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view containers" ON public.containers;
CREATE POLICY "Staff can view containers"
    ON public.containers FOR SELECT
    USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can insert containers" ON public.containers;
CREATE POLICY "Staff can insert containers"
    ON public.containers FOR INSERT
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can update containers" ON public.containers;
CREATE POLICY "Staff can update containers"
    ON public.containers FOR UPDATE
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins only can delete containers" ON public.containers;
CREATE POLICY "Admins only can delete containers"
    ON public.containers FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- سياسات جدول customers (العملاء)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
CREATE POLICY "Staff can view customers"
    ON public.customers FOR SELECT
    USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can insert customers" ON public.customers;
CREATE POLICY "Staff can insert customers"
    ON public.customers FOR INSERT
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
CREATE POLICY "Staff can update customers"
    ON public.customers FOR UPDATE
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins only can delete customers" ON public.customers;
CREATE POLICY "Admins only can delete customers"
    ON public.customers FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- سياسات جدول contracts (العقود)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view contracts" ON public.contracts;
CREATE POLICY "Staff can view contracts"
    ON public.contracts FOR SELECT
    USING (
        public.is_admin() OR (
            public.is_active_staff() AND (
                EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND can_view_all_records = true)
                OR created_by_employee_id = auth.uid() 
                OR assigned_employee_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Staff can insert contracts" ON public.contracts;
CREATE POLICY "Staff can insert contracts"
    ON public.contracts FOR INSERT
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can update contracts" ON public.contracts;
CREATE POLICY "Staff can update contracts"
    ON public.contracts FOR UPDATE
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins only can delete contracts" ON public.contracts;
CREATE POLICY "Admins only can delete contracts"
    ON public.contracts FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- سياسات جدول notification_logs (سجل تنبيهات الواتساب)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view notifications logs" ON public.notification_logs;
CREATE POLICY "Staff can view notifications logs"
    ON public.notification_logs FOR SELECT
    USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can insert and update notifications logs" ON public.notification_logs;
CREATE POLICY "Staff can insert and update notifications logs"
    ON public.notification_logs FOR INSERT
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can update notifications logs status" ON public.notification_logs;
CREATE POLICY "Staff can update notifications logs status"
    ON public.notification_logs FOR UPDATE
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins only can delete notifications logs" ON public.notification_logs;
CREATE POLICY "Admins only can delete notifications logs"
    ON public.notification_logs FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- سياسات جدول notifications (الإشعارات الداخلية In-App)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view in-app notifications" ON public.notifications;
CREATE POLICY "Staff can view in-app notifications"
    ON public.notifications FOR SELECT
    USING (
        public.is_admin() OR 
        (public.is_active_staff() AND (user_id IS NULL OR user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Staff can update read status on in-app notifications" ON public.notifications;
CREATE POLICY "Staff can update read status on in-app notifications"
    ON public.notifications FOR UPDATE
    USING (
        public.is_admin() OR 
        (public.is_active_staff() AND (user_id IS NULL OR user_id = auth.uid()))
    )
    WITH CHECK (
        public.is_admin() OR 
        (public.is_active_staff() AND (user_id IS NULL OR user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Staff can insert in-app notifications" ON public.notifications;
CREATE POLICY "Staff can insert in-app notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins only can delete in-app notifications" ON public.notifications;
CREATE POLICY "Admins only can delete in-app notifications"
    ON public.notifications FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- سياسات جدول whatsapp_settings (إعدادات البوابة - خاصة بالمدير فقط)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full control on whatsapp_settings" ON public.whatsapp_settings;
CREATE POLICY "Admins full control on whatsapp_settings"
    ON public.whatsapp_settings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view whatsapp_settings" ON public.whatsapp_settings;
CREATE POLICY "Staff can view whatsapp_settings"
    ON public.whatsapp_settings FOR SELECT
    USING (public.is_active_staff());

-- ------------------------------------------------------------------------------
-- سياسات جدول payment_settings (إعدادات بوابة الدفع - خاصة بالمدير فقط)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full control on payment_settings" ON public.payment_settings;
CREATE POLICY "Admins full control on payment_settings"
    ON public.payment_settings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view payment_settings" ON public.payment_settings;
CREATE POLICY "Staff can view payment_settings"
    ON public.payment_settings FOR SELECT
    USING (public.is_active_staff());

-- ------------------------------------------------------------------------------
-- سياسات جدول receipts (سندات القبض)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view receipts" ON public.receipts;
CREATE POLICY "Staff can view receipts"
    ON public.receipts FOR SELECT
    USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff can insert receipts" ON public.receipts;
CREATE POLICY "Staff can insert receipts"
    ON public.receipts FOR INSERT
    WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admins only can delete receipts" ON public.receipts;
CREATE POLICY "Admins only can delete receipts"
    ON public.receipts FOR DELETE
    USING (public.is_admin());

-- ==============================================================================
-- 15. بيانات تجريبية أولية (Seed Data)
-- ==============================================================================
INSERT INTO public.containers (container_number, type, status, daily_rate, monthly_rate, notes)
VALUES 
    ('C-101', 'commercial', 'available', 0.00, 3500.00, 'حاوية تجارية مغلقة للمستودعات والشركات'),
    ('C-102', 'commercial', 'available', 0.00, 3500.00, 'حاوية تجارية مخصصة للمنشآت والمجمعات'),
    ('D-201', 'debris', 'available', 150.00, 0.00, 'حاوية أنقاض ومخلفات بناء وترميم'),
    ('D-202', 'debris', 'available', 150.00, 0.00, 'حاوية أنقاض للمشاريع والمقاولات'),
    ('D-203', 'debris', 'available', 150.00, 0.00, 'حاوية أنقاض ومخلفات يومية')
ON CONFLICT (container_number) DO NOTHING;

-- إعدادات بوابة الواتساب الافتراضية
INSERT INTO public.whatsapp_settings (provider, instance_id, api_token, sender_phone, admin_phone, is_connected, auto_send_enabled)
VALUES 
    ('ultramsg', 'instance_muhtaraz_01', 'tok_muhtaraz_sec_9988', '+966920001234', '+966500000001', true, true)
ON CONFLICT DO NOTHING;

-- إعدادات بوابة الدفع Moyasar الافتراضية
INSERT INTO public.payment_settings (is_enabled, publishable_key, secret_key, apple_pay_enabled, mada_enabled, credit_card_enabled)
VALUES 
    (true, 'pk_test_muhtaraz_demo_key', 'sk_test_muhtaraz_secret_key', true, true, true)
ON CONFLICT DO NOTHING;

-- إضافة إشعارات داخلية أولية تجريبية
INSERT INTO public.notifications (title, message, type, is_read)
VALUES 
    ('⚠️ تنبيه موعد سحب وشيك (خلال 4 ساعات)', 'حاوية الأنقاض رقم (D-202) بالملقا تستحق السحب اليوم الساعة 4:00 عصراً.', 'contract_expiry_soon', false),
    ('📅 تنبيه تجديد عقد تجاري (قبل 5 أيام)', 'عقد الحاوية التجارية (CTR-2026-001) لمؤسسة صروح البناء شارف على الانتهاء.', 'contract_expiry_soon', false),
    ('✨ جاهزية النظام', 'تم ربط وتشغيل محرك الإشعارات الداخلية وأنظمة المتابعة اللحظية بنجاح.', 'system_alert', true)
ON CONFLICT DO NOTHING;


