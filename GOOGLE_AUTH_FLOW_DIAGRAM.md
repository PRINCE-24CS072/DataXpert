# 🔐 Google Authentication Flow Diagram

## Visual Flow Chart

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER INITIATES GOOGLE AUTH                        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Which Modal is Open?    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼──────┐           ┌─────▼──────┐
              │   SIGNUP   │           │   LOGIN    │
              │   Modal    │           │   Modal    │
              └─────┬──────┘           └─────┬──────┘
                    │                         │
         action = 'signup'           action = 'login'
                    │                         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Google OAuth Returns    │
                    │  email, name, photo, ID  │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Check: User Exists in   │
                    │ Database?               │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
          ┌─────────▼────────┐      ┌────────▼─────────┐
          │   USER EXISTS    │      │  USER NOT FOUND  │
          └─────────┬────────┘      └────────┬─────────┘
                    │                         │
        ┌───────────┴──────────┐   ┌─────────┴────────────┐
        │                      │   │                      │
  ┌─────▼──────┐      ┌───────▼───▼──┐         ┌────────▼────────┐
  │  action =  │      │   action =   │         │   action =      │
  │  'signup'  │      │   'login'    │         │   'signup'      │
  └─────┬──────┘      └───────┬──────┘         └────────┬────────┘
        │                     │                          │
        │                     │                          │
  ┌─────▼──────────┐   ┌──────▼─────────┐      ┌────────▼────────────┐
  │ ❌ ERROR       │   │ ✅ SUCCESS     │      │ ✅ SUCCESS          │
  │ "User exists,  │   │ Login user     │      │ Create new account  │
  │ please login"  │   │ Update Google  │      │ with Google data    │
  │                │   │ ID if missing  │      │ + generated pwd     │
  │ Auto-switch to │   │                │      │                     │
  │ login modal    │   │ Check if       │      │ Set business_name   │
  │ after 2s       │   │ business_name  │      │ = NULL              │
  └────────────────┘   │ is missing     │      │                     │
                       │                │      │ Flag: needs_profile │
                       │ Return user +  │      │ _completion = true  │
                       │ JWT token      │      │                     │
                       └────────┬───────┘      └──────────┬──────────┘
                                │                         │
                                └────────────┬────────────┘
                                             │
                             ┌───────────────▼──────────────┐
                             │ FRONTEND RECEIVES RESPONSE   │
                             └───────────────┬──────────────┘
                                             │
                                ┌────────────┴────────────┐
                                │                         │
                      ┌─────────▼──────────┐   ┌─────────▼────────┐
                      │  success: true     │   │  success: false  │
                      └─────────┬──────────┘   └─────────┬────────┘
                                │                         │
                    ┌───────────▼───────────┐            │
                    │ Store JWT token       │      ┌─────▼────────┐
                    │ Store user data       │      │ Show error   │
                    │ Cache dashboard stats │      │ message      │
                    └───────────┬───────────┘      │              │
                                │                  │ Auto-switch  │
                    ┌───────────▼───────────┐      │ modals if    │
                    │ needs_profile_        │      │ needed       │
                    │ completion?           │      └──────────────┘
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
          ┌─────────▼──────┐      ┌────────▼────────┐
          │     TRUE       │      │     FALSE       │
          └─────────┬──────┘      └────────┬────────┘
                    │                      │
          ┌─────────▼──────────┐  ┌────────▼─────────┐
          │ Set flag in        │  │ Show standard    │
          │ localStorage       │  │ success message  │
          │                    │  └────────┬─────────┘
          │ Show: "Complete    │           │
          │ your profile"      │           │
          └─────────┬──────────┘           │
                    │                      │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Redirect to          │
                    │ dashboard.html       │
                    │ after 1.5 seconds    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ DASHBOARD PAGE       │
                    │                      │
                    │ Checks localStorage  │
                    │ for completion flag  │
                    │                      │
                    │ OR checks user.      │
                    │ business_name        │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ If business_name is  │
                    │ missing:             │
                    │                      │
                    │ 📢 SHOW BANNER:      │
                    │ "Complete Your       │
                    │ Profile - Add        │
                    │ business name"       │
                    │                      │
                    │ [Complete Now] [×]   │
                    └──────────────────────┘
```

## Detailed Flow Scenarios

### 🆕 Scenario 1: New User Signup with Google

```
User Action: Opens signup modal → Clicks "Sign up with Google"

Backend Process:
├─ Receives Google token + action='signup'
├─ Verifies token with Google servers
├─ Extracts: email, name, profile_picture, google_id
├─ Checks if email exists in database
├─ User NOT found → Proceed with signup
├─ Creates new user:
│  ├─ email: from Google
│  ├─ name: from Google
│  ├─ google_id: from Google
│  ├─ password: hash(google_id) [auto-generated]
│  ├─ profile_image: from Google
│  ├─ business_name: NULL
│  └─ profile_completed: TRUE [allows dashboard access]
├─ Generates JWT token (7-day expiry)
└─ Returns: {success: true, user, token, needs_profile_completion: true}

Frontend Response:
├─ Stores token in localStorage
├─ Stores user data in localStorage
├─ Sets flag: 'dataxpert_needs_profile_completion'
├─ Shows message: "✓ Account created! Please complete your profile"
└─ Redirects to dashboard → Banner appears
```

### 🔁 Scenario 2: Existing User Tries to Signup Again

```
User Action: Opens signup modal → Clicks "Sign up with Google"

Backend Process:
├─ Receives Google token + action='signup'
├─ Verifies token
├─ Checks if email exists
├─ User FOUND → Block signup
└─ Returns: {success: false, already_exists: true, message: "..."}

Frontend Response:
├─ Shows error: "⚠ Account already exists. Please login instead"
├─ After 2 seconds:
│  ├─ Closes signup modal
│  └─ Opens login modal automatically
└─ User can now login
```

### ✅ Scenario 3: Existing User Login with Google

```
User Action: Opens login modal → Clicks "Login with Google"

Backend Process:
├─ Receives Google token + action='login'
├─ Verifies token
├─ Checks if email exists
├─ User FOUND → Proceed with login
├─ Updates if needed:
│  ├─ google_id (if not set - links manual account to Google)
│  └─ profile_image (if Google has better quality)
├─ Generates JWT token
├─ Checks if business_name exists
└─ Returns: {success: true, user, token, needs_profile_completion: [bool]}

Frontend Response:
├─ Stores token and user data
├─ Sets completion flag IF business_name is missing
├─ Shows success message
└─ Redirects to dashboard
```

### ⚠️ Scenario 4: New User Tries to Login

```
User Action: Opens login modal → Clicks "Login with Google" (no account)

Backend Process:
├─ Receives Google token + action='login'
├─ Verifies token
├─ Checks if email exists
├─ User NOT FOUND → Block login
└─ Returns: {success: false, need_signup: true, message: "..."}

Frontend Response:
├─ Shows error: "⚠ No account found. Please sign up first"
├─ After 2 seconds:
│  ├─ Closes login modal
│  └─ Opens signup modal automatically
└─ User can now sign up
```

### 📝 Scenario 5: Complete Profile

```
User Action: Clicks "Complete Now" on dashboard banner

Navigation:
├─ Redirects to profile.html
├─ User fills in "Business Name" field
└─ Clicks "Save Changes"

Backend Process:
├─ Receives: {name, business_name}
├─ Updates user record in database
└─ Returns: {success: true, user}

Frontend Response:
├─ Updates localStorage with new user data
├─ Clears flags:
│  ├─ Removes 'dataxpert_needs_profile_completion'
│  └─ Removes 'dataxpert_profile_banner_dismissed'
├─ Shows success message: "Profile updated successfully!"
└─ Next dashboard visit → No banner
```

## 🎨 Banner Behavior

```
Dashboard Load → checkProfileCompletion()
│
├─ Check Flag: 'dataxpert_needs_profile_completion'
├─ Check User: user.business_name === null
├─ Check Dismissed: 'dataxpert_profile_banner_dismissed'
│
└─ IF (flag OR no business_name) AND not dismissed:
   │
   ├─ Show Banner:
   │  ┌──────────────────────────────────────────────┐
   │  │ 📢 Complete Your Profile                     │
   │  │ Add your business details to unlock all      │
   │  │ features and get personalized insights       │
   │  │                                              │
   │  │               [Complete Now]  [×]            │
   │  └──────────────────────────────────────────────┘
   │
   ├─ Click [Complete Now] → Redirect to profile.html
   │
   └─ Click [×] → Hide banner + Set 'dataxpert_profile_banner_dismissed'
```

## 🔄 Password Handling

### For Google Users:
```
Signup → password = hash(google_id + salt)
         ├─ Stored in database
         ├─ User can change it later in profile settings
         └─ Enables manual login if needed
```

### For Manual Users:
```
Signup → password = hash(user_input + salt)
Login with Google → Links google_id to account
                   ├─ Keeps existing password
                   └─ Can login with either method
```

---

**Quick Reference:**
- ✅ = Success flow
- ❌ = Error flow
- 📢 = Banner/Notification
- 🔄 = Process/Update
- ⚠️ = Warning
