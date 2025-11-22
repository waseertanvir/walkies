export async function findProfileById(uuid: string, token: string) {
  const useExternalService = import.meta.env.VITE_USE_EXTERNAL_PROFILE_SERVICE === 'true';
  if (!useExternalService) {
      console.log("External profile service disabled, skipping...");
      return null;
  }
  
    if(!token) {
      console.log("REST call failure. Token is null!");
    }

    const responseBody = await fetch('http://157.230.155.46:49152/walkies-profile-service/profile/'+uuid, {
      method: "GET",
      headers: {"Authorization": `Bearer ${token}`}
    })

    if (!responseBody.ok) {
        console.warn(`Profile service returned ${responseBody.status}, falling back to Supabase`);
        return null;
    }

    return responseBody.json();
}