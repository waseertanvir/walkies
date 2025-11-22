export async function findProfileById(uuid: string, token: string) {
    if(!token) {
      console.log("REST call failure. Token is null!");
    }

    const responseBody = await fetch('http://157.230.155.46:49152/walkies-profile-service/profile/'+uuid, {
      method: "GET",
      headers: {"Authorization": `Bearer ${token}`}
    })

    return responseBody.json();
}