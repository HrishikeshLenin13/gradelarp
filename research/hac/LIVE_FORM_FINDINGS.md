# Public HAC login form findings

Recorded: 2026-10-15 03:46 UTC. Method: unauthenticated HTTPS GETs of the two login pages and their public static `LogOn.js`; DOM metadata inspection with Cheerio. No credential input, login POST, challenge action, authenticated request, or foreign-code execution occurred. Response bodies and cookie/token values were kept out of this report and were not saved.

## Verified hosts and form structure

- **Leander:** the [district HAC guide](https://www.leanderisd.org/homeaccesscenter/) links to [this login](https://lis-hac.eschoolplus.powerschool.com/HomeAccess/Account/LogOn?ReturnUrl=%2FHomeAccess). A fresh direct GET returned HTTP 200, title `Login`, with Leander-specific welcome text. The form method is `post`; action is `/HomeAccess/Account/LogOn?ReturnUrl=%2FHomeAccess`.
- **Round Rock:** the [district HAC page](https://www.roundrockisd.org/o/rrisd/page/home-access-center) contains the official link to `accesscenter.roundrockisd.org`. [The inspected login](https://accesscenter.roundrockisd.org/HomeAccess/Account/LogOn?ReturnUrl=%2FHomeAccess%2FHome%2FSchoolLinks) returned HTTP 200, title `Login`. Its form method is `post`; action is `/HomeAccess/Account/LogOn?ReturnUrl=%2FHomeAccess%2FHome%2FSchoolLinks`. The action reflects the incoming ReturnUrl and should be resolved/validated from the current response rather than assumed to be globally fixed.

Both inspected forms have these successful-control names:

| Name | Observed initial structure/value |
|---|---|
| `__RequestVerificationToken` | Hidden anti-forgery field; value intentionally not recorded. |
| `Type` | Hidden, `Normal`. |
| `LocalLogin` | Hidden, `False`. |
| `SiteCode` | Hidden, empty. |
| `SCKTY00328510CustomEnabled` | Hidden, `False`. |
| `SCKTY00436568CustomEnabled` | Hidden, `False`. |
| `Database` | **Hidden input, `10`; no database dropdown/options on either current initial form.** |
| `VerificationOption` | Hidden, `UsernamePassword`. |
| `LogOnDetails.UserName` | Text input, id `LogOnDetails_UserName`, autocomplete `off`. |
| `LogOnDetails.Password` | Password input, id `LogOnDetails_Password`, autocomplete `off`. |
| `tempUN`, `tempPW` | Additional text/password inputs. Their presence does not establish a separate supported authentication method. |
| `login` | Submit button, id `login`. |

Source pages also expose password-reset, HAC registration and access-code registration links. Public static scripts at `/HomeAccess/Scripts/Account/LogOn.js` on both hosts contain database-change registration checks and verification-option handling. **This does not prove that changing Database manually is valid.** No database lookup or registration request was made.

## CSRF and initial cookie attributes (values omitted)

Both GETs set `__RequestVerificationToken_L0hvbWVBY2Nlc3M1` with `Path=/; HttpOnly` and supply the hidden form token. A future session-aware connector must preserve the matching cookie and form token; token presence alone does not establish authentication success.

Both also set:

- `ASP.NET_SessionId`: `Path=/; Secure; HttpOnly; SameSite=Lax`.
- `.AuthCookie`: expired in 1999 on the unauthenticated response, `Path=/; Secure; HttpOnly; SameSite=Lax`. This is a clearing cookie, not a verified authenticated session.
- `SPIHACSiteCode`: `Path=/; HttpOnly`.

The Leander response additionally sets gateway affinity cookies (`ApplicationGatewayAffinityCORS`: `Path=/; SameSite=None; Secure`; `ApplicationGatewayAffinity`: `Path=/`) and Incapsula-family cookies on `.eschoolplus.powerschool.com`. Some of those observed cookies omit Secure and/or HttpOnly. These are observed response attributes, not a claim about the full provider deployment or login outcome. Cookie values were never recorded.

## Challenges, student selection and data accuracy

Neither initial form visibly offers SSO, MFA, CAPTCHA or a student selector. **Their absence before submitting credentials does not establish that these states never occur after authentication.** The Leander response contains Incapsula resource markup; that is evidence of a provider protection layer, not evidence that a challenge occurred. An integration should stop and report a provider-required interactive step if one appears, not treat every redirect away from LogOn as success.

The official Leander guide documents a post-login Change Student feature for guardians with multiple students. An adapter must identify which student is selected and require an explicit choice when ambiguous. No authenticated selectors, student identifier, course HTML or assignment HTML were verified here.

The [historical assignments API documentation](https://homeaccesscenterapi-docs.vercel.app/api-reference/assignments) provides only positional arrays, not a stable current HTML contract. Its response shape is insufficient to verify a production parser. The [Leander guide](https://www.leanderisd.org/homeaccesscenter/) also explains that unpublished assignments may affect averages and category weights matter. A visible-assignment reconstruction must stay distinct from the source-reported official average; unknown marks must not become zero.

## Verified versus unverified conclusion

**Verified:** two public ordinary login forms, exact current field names, hidden Database=10, form actions, anti-forgery field/cookie presence, and unauthenticated cookie attributes. **Unverified:** successful authentication, credential error/lockout behavior, MFA/SSO transitions, student selection markup, current gradebook markup, district grading semantics, or compatibility with any other ISD. These observations are not an integration test or a universal-district compatibility claim.
