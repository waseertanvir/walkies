export async function findProfileById(uuid: string, token: string) {
    if(!token) {
      console.log("REST call failure. Token is null!");
      return null; // Return null instead of continuing
    }

    try {
        const responseBody = await fetch('http://157.230.155.46:49152/walkies-profile-service/profile/'+uuid, {
            method: "GET",
            headers: {"Authorization": `Bearer ${token}`}
        });

        if (!responseBody.ok) {
            console.warn(`Profile service returned ${responseBody.status}, falling back to Supabase`);
            return null;
        }

        return await responseBody.json();
    } catch (error) {
        console.error("Error fetching from external profile service:", error);
        return null; // Return null to trigger Supabase fallback
    }
}