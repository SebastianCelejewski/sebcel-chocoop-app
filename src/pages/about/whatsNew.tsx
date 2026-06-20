function WhatsNew() {
    return <>
        <h2 className="pageTitle" data-testid="about-page">O aplikacji</h2>
        <ul className="richText">
            <h1>Co nowego w aplikacji</h1>
            <p className="label"><b>Wersja 0.5.3</b></p>
            <ul>
                <li>Poprawienie szybkości działania aplikacji - po dodaniu nowej czynności statystyki przebudowują się w czasie ok. 100 ms, zamiast 10-12 s.</li>
            </ul>

            <p className="label"><b>Wersja 0.5.2</b></p>
            <ul>
                <li>Podczas dodawania nowej czynności aplikacja sprawdza czy istnieją zlecenia na tę czynność. Jeśli tak, to użytkownik może podpiąć nową czynność do istniejącego zlecenia. Zlecenie zostanie wtedy oznaczone jako wykonane.</li>
            </ul>

            <p className="label"><b>Wersja 0.5.1</b></p>
            <ul>
                <li>Dodanie informacji o bieżącej dacie, by użytkownik mógł łatwiej zorientować się czy w danym dniu już wpisywał swoje czynności, czy jeszcze nie</li>
            </ul>

            <p className="label"><b>Wersja 0.5.0</b></p>
            <ul>
                <li>Przyspieszenie działania aplikacji na liście czynności</li>
                <li>Dodanie możliwości filtrowania (moje czynności/czynności całej rodziny)</li>
            </ul>

            <p className="label"><b>Wersja 0.4.13</b></p>
            <ul>
                <li>Linie na wykresach przy braku danych dla danych dni, miesięcy lub lat nie biegną do prawej krawędzi wykresu</li>
                <li>Tabelki nie zawierają zer dla dni, kiedy użytkownicy nie wykonali żadnych prac</li>
            </ul>

            <p className="label"><b>Wersja 0.4.12</b></p>
            <ul>
                <li>Rezygnacja z zapisywania czasu wykonania czynności, zostaje sama data</li>
                <li>Dodanie przycisków ,,Wczoraj'' i ,,Dzisiaj'' dla szybszego wprowadzania wykonanych czynności</li>
                <li>Nowe ikony czynności (v2)</li>
            </ul>

            <p className="label"><b>Wersja 0.4.11</b></p>
            <ul>
                <li>Naprawienie błędu statystyk, które coraz częściej się nie pokazywały</li>
            </ul>

            <p className="label"><b>Wersja 0.4.10</b></p>
            <ul>
                <li>Dodanie wykresów na stronie statystyk doświadczenia</li>
                <li>Różne ulepszenia strony wyświetlającej statystyki doświadczenia</li>
            </ul>

            <p className="label"><b>Wersja 0.4.9</b></p>
            <ul>
                <li>Zwiększenie bezpieczeństwa danych poprzez wprowadzenie automatycznego tworzenia kopii zapasowych</li>
                <li>Zwiększenie szybkości działania aplikacji na liście czynności i liście zleceń</li>
            </ul>

            <p className="label"><b>Wersja 0.4.8</b></p>
            <ul>
                <li>Reakcje są widoczne na stronie aktywności natychmiast po ich dodaniu</li>
            </ul>

            <p className="label"><b>Wersja 0.4.7</b></p>
            <ul>
                <li>Usunięty błąd polegający na tworzeniu duplikatu wykonanej czynności ze zlecenia</li>
                <li>Drobne poprawki w statystykach</li>
                <li>Usunięty błąd polegający na braku możliwości wystawienia zlecenia z ważnością ,,jak najszybciej''</li>
            </ul>

            <p className="label"><b>Wersja 0.4.6</b></p>
            <ul>
                <li>Dodanie wyświetlania statystyk miesięcznych, dziennych i dla wybranego dnia</li>
                <li>Poprawne wyświetlanie wyniku procentowego w przypadku, jeśli w danym dniu nikt nie wykonał żadnej pracy</li>
            </ul>

            <p className="label"><b>Wersja 0.4.5</b></p>
            <ul>
                <li>Wprowadzenie tekstowych opisów pilności zadań (zamiast liczbowych)</li>
                <li>Wprowadzenie reakcji na wykonane czynności</li>
                <li>Drobne poprawki interfejsu użytkownika</li>
            </ul>

            <p className="label"><b>Wersja 0.4.4</b></p>
            <ul>
                <li>Poprawienie błędu wczytywania się strony startowej</li>
            </ul>

            <p className="label"><b>Wersja 0.4.3</b></p>
            <ul>
                <li>Możliwość zainstalowania jako aplikacji na telefonie</li>
            </ul>

            <p className="label"><b>Wersja 0.4.2</b></p>
            <ul>
                <li>Wyświetlanie statystyk zdobytych punktów doświadczenia</li>
                <li>Nowa sekcja: O aplikacji</li>
            </ul>

            <p className="label"><b>Wersja 0.4.1</b></p>
            <ul>
                <li>Dodanie tła do ikonek szablonów czynności dla lepszej czytelności</li>
                <li>Dodanie nowego szablonu czynności: rozpakowywanie zakupów Frisco</li>
                <li>Dodanie możliwości filtrowania zleceń (wszystkie/niewykonane)</li>
                <li>Poprawionych kilka błędów</li>
            </ul>

            <p className="label"><b>Wersja 0.3.2</b></p>
            <ul>
                <li>Wprowadzenie zależności pomiędzy czynnościami a zleceniami</li>
                <li>Dodanie statusu zlecenia: wykonane lub niewykonane</li>
                <li>Ulepszona nawigacja między listą czynności a listą zleceń</li>
                <li>Kilka poprawionych błędów aplikacji</li>
            </ul>

            <p className="label"><b>Wersja 0.3.1</b></p>
            <ul>
                <li>Tworzenie, edycja, usuwanie i przeglądanie zleceń</li>
            </ul>

            <p className="label"><b>Wersja 0.2</b></p>
            <ul>
                <li>Automatyczne wypełnianie pola "osoba" podczas tworzenia nowej czynności</li>
                <li>Tworzenie czynności na podstawie szablonów</li>
                <li>Poprawki interfejsu użytkownika</li>
            </ul>

            <p className="label"><b>Wersja 0.1</b></p>
            <ul>
                <li>Tworzenie kont, logowanie się i wylogowywanie się</li>
                <li>Dodawanie nowej czynności</li>
                <li>Wyświetlanie szczegółów wykonanej czynności</li>
                <li>Wyświetlanie listy wykonanych czynności</li>
            </ul>

        </ul>
    </>
}

export default WhatsNew;