function reportError(message: string, cause?: any) {
    const errorGuid = crypto.randomUUID();
    
    console.log(errorGuid + ": " + message)
    
    if (cause !== undefined) {
        if (cause instanceof Error) {
            console.log(errorGuid + ": " + JSON.stringify(cause.message))
            console.log(errorGuid + ": " + JSON.stringify(cause.stack))
        } else {
            console.log(errorGuid + ": " + JSON.stringify(cause))
        }

    }
    
    alert("Wystąpił błąd. Powiadom twórcę aplikacji wysyłając mu ten identyfikator błędu: " + errorGuid)
    return message;
}

export default reportError;