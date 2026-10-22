import supabase from "../config/supabase.js";
import { sendPushToUsers } from "../services/pushNotification.service.js";

// =======================
// 1. ADD SERVICE (APPROVED BARBER)
// =======================
export async function addService(req, res) {
try {
if (!req.user?.id) {
return res.status(401).json({ error: "Unauthorized" });
}

const { name, price, duration, home_service } = req.body;  

if (  
  typeof name !== "string" ||  
  !name.trim() ||  
  price === undefined ||  
  price === null ||  
  price === "" ||  
  !Number.isFinite(Number(price)) ||  
  Number(price) < 0 ||  
  duration === undefined ||  
  duration === null ||  
  duration === "" ||  
  !Number.isFinite(Number(duration)) ||  
  Number(duration) <= 0  
) {  
  return res.status(400).json({  
    error: "Valid name, price and duration are required"  
  });  
}  

if (  
  home_service !== undefined &&  
  typeof home_service !== "boolean"  
) {  
  return res.status(400).json({  
    error: "home_service must be true or false"  
  });  
}  

const { data: barber, error: barberError } = await supabase  
  .from("barbers")  
  .select("id, shop_name, status")  
  .eq("user_id", req.user.id)  
  .maybeSingle();  

if (barberError) {  
  console.error("Find barber error:", barberError);  
  return res.status(500).json({  
    error: "Failed to verify barber profile"  
  });  
}  

if (!barber) {  
  return res.status(403).json({  
    error: "Barber profile not found"  
  });  
}  

if (  
  typeof barber.status !== "string" ||  
  barber.status.toLowerCase() !== "approved"  
) {  
  return res.status(403).json({  
    error: "Only approved barbers can add services"  
  });  
}  

const { data: profile, error: profileError } = await supabase  
  .from("profiles")  
  .select("full_name")  
  .eq("id", req.user.id)  
  .maybeSingle();  

if (profileError) {  
  console.error("Find profile error:", profileError);  
  return res.status(500).json({  
    error: "Failed to fetch barber profile"  
  });  
}  

const barberName = profile?.full_name || "Barber";  

const { data: service, error: insertError } = await supabase  
  .from("services")  
  .insert({  
    barber_id: barber.id,  
    name: name.trim(),  
    price: Number(price),  
    duration: Number(duration),  
    home_service: home_service ?? false  
  })  
  .select()  
  .single();  

if (insertError) {  
  console.error("Add service error:", insertError);  
  return res.status(500).json({  
    error: "Failed to add service"  
  });  
}  

// Notify customers; notification failure does not undo service creation.  
const { data: customers, error: customersError } = await supabase  
  .from("profiles")  
  .select("id")  
  .eq("role", "customer");  

if (customersError) {  
  console.error("Fetch customers for notifications:", customersError);  
} else if (customers?.length) {  
  const notifications = customers.map((customer) => ({  
    user_id: customer.id,  
    message: `🆕 New service by ${barberName} (${barber.shop_name || "Shop"}): '${name.trim()}' — ₹${Number(price)}. Book now!`  
  }));  

  const { data: createdNotifications, error: notificationError } = await supabase
    .from("notifications")  
    .insert(notifications)
    .select("user_id");

  if (notificationError) {  
    console.error("Service notification error:", notificationError);  
  } else {
    void sendPushToUsers({
      userIds: [...new Set((createdNotifications || []).map((row) => row.user_id))],
      title: "New service available",
      body: `A new service was added by ${barberName} at ${barber.shop_name || "Shop"}: ${name.trim()}.`,
      data: { type: "new_service" },
    });
  }  
}  

return res.status(201).json({  
  success: true,  
  message: "Service added successfully",  
  data: service  
});

} catch (err) {
console.error("Add service error:", err);
return res.status(500).json({ error: "Server error" });
}
}

// =======================
// 2. GET SERVICES BY BARBER
// =======================
export async function getServicesByBarber(req, res) {
try {
const { barber_id } = req.params;

if (!barber_id) {  
  return res.status(400).json({ error: "barber_id required" });  
}  

const { data: barber, error: barberError } = await supabase  
  .from("barbers")  
  .select("id, status")  
  .eq("id", barber_id)  
  .maybeSingle();  

if (barberError) {  
  console.error("Find barber error:", barberError);  
  return res.status(500).json({ error: "Failed to fetch barber" });  
}  

if (  
  !barber ||  
  typeof barber.status !== "string" ||  
  barber.status.toLowerCase() !== "approved"  
) {  
  return res.status(404).json({  
    error: "Approved barber not found"  
  });  
}  

const { data, error } = await supabase  
  .from("services")  
  .select("*")  
  .eq("barber_id", barber_id);  

if (error) {  
  console.error("Get barber services error:", error);  
  return res.status(500).json({  
    error: "Failed to fetch services"  
  });  
}  

return res.json(data);

} catch (err) {
console.error("Get barber services error:", err);
return res.status(500).json({ error: "Server error" });
}
}

// =======================
// 3. GET MY SERVICES
// =======================
export async function getMyServices(req, res) {
try {
if (!req.user?.id) {
return res.status(401).json({ error: "Unauthorized" });
}

const { data: barber, error: barberError } = await supabase  
  .from("barbers")  
  .select("id")  
  .eq("user_id", req.user.id)  
  .maybeSingle();  

if (barberError) {  
  console.error("Find own barber error:", barberError);  
  return res.status(500).json({  
    error: "Failed to fetch barber profile"  
  });  
}  

if (!barber) {  
  return res.status(403).json({  
    error: "Barber profile not found"  
  });  
}  

const { data, error } = await supabase  
  .from("services")  
  .select("*")  
  .eq("barber_id", barber.id)  
  .order("created_at", { ascending: false });  

if (error) {  
  console.error("Get own services error:", error);  
  return res.status(500).json({  
    error: "Failed to fetch services"  
  });  
}  

return res.json(data);

} catch (err) {
console.error("Get own services error:", err);
return res.status(500).json({ error: "Server error" });
}
}

// =======================
// 4. UPDATE SERVICE (OWNER ONLY)
// =======================
export async function updateService(req, res) {
try {
if (!req.user?.id) {
return res.status(401).json({ error: "Unauthorized" });
}

const { id } = req.params;  
const { name, price, duration, home_service } = req.body;  

if (!id) {  
  return res.status(400).json({ error: "Service ID required" });  
}  

const updates = {};  

if (name !== undefined) {  
  if (typeof name !== "string" || !name.trim()) {  
    return res.status(400).json({ error: "Invalid service name" });  
  }  
  updates.name = name.trim();  
}  

if (price !== undefined) {  
  if (  
    price === "" ||  
    !Number.isFinite(Number(price)) ||  
    Number(price) < 0  
  ) {  
    return res.status(400).json({ error: "Invalid service price" });  
  }  
  updates.price = Number(price);  
}  

if (duration !== undefined) {  
  if (  
    duration === "" ||  
    !Number.isFinite(Number(duration)) ||  
    Number(duration) <= 0  
  ) {  
    return res.status(400).json({ error: "Invalid service duration" });  
  }  
  updates.duration = Number(duration);  
}  

if (home_service !== undefined) {  
  if (typeof home_service !== "boolean") {  
    return res.status(400).json({  
      error: "home_service must be true or false"  
    });  
  }  
  updates.home_service = home_service;  
}  

if (Object.keys(updates).length === 0) {  
  return res.status(400).json({  
    error: "No valid fields provided"  
  });  
}  

const { data: barber, error: barberError } = await supabase  
  .from("barbers")  
  .select("id, status")  
  .eq("user_id", req.user.id)  
  .maybeSingle();  

if (barberError) {  
  console.error("Find barber error:", barberError);  
  return res.status(500).json({  
    error: "Failed to verify barber profile"  
  });  
}  

if (!barber) {  
  return res.status(403).json({  
    error: "Barber profile not found"  
  });  
}  

if (  
  typeof barber.status !== "string" ||  
  barber.status.toLowerCase() !== "approved"  
) {  
  return res.status(403).json({  
    error: "Only approved barbers can update services"  
  });  
}  

const { data, error } = await supabase  
  .from("services")  
  .update(updates)  
  .eq("id", id)  
  .eq("barber_id", barber.id)  
  .select("id")  
  .maybeSingle();  

if (error) {  
  console.error("Update service error:", error);  
  return res.status(500).json({  
    error: "Failed to update service"  
  });  
}  

if (!data) {  
  return res.status(404).json({  
    error: "Service not found or not owned by you"  
  });  
}  

return res.json({  
  success: true,  
  message: "Service updated successfully"  
});

} catch (err) {
console.error("Update service error:", err);
return res.status(500).json({ error: "Server error" });
}
}

// =======================
// 5. GET ALL SERVICES
// =======================
export async function getServices(req, res) {
try {
const { data, error } = await supabase
.from("services")
.select("*, barbers(id, shop_name, user_id)")
.order("created_at", { ascending: false });

if (error) {  
  console.error("Get all services error:", error);  
  return res.status(500).json({  
    error: "Failed to fetch services"  
  });  
}  

return res.json(data);

} catch (err) {
console.error("Get all services error:", err);
return res.status(500).json({ error: "Server error" });
}
}
