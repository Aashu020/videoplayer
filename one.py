num1 = int(input("Enter number: "))
num2 = int(input("Enter range: "))
sum = 0
fact = 1
inc = 0
new_sal = 0
tax = 0
tax_sal = 0

if(num1 > 5):
    for i in range(1, (num2+1)):
        sum = sum + i
    print("sum", sum)
    sal = int(input("enter  your salary: "))
    year = int(input("enter  years of working: "))
    print("your salary is",sal, "and Years of working is ",year)
    if (sal > 1200000):
        for i in range (1, (year+1)):
            inc = sal * 0.1
            new_sal = sal + inc
            tax = sal * 0.18
            tax_sal = sal - tax
            print(i,"year", "increment amount", inc,"tax amount ", tax)    
            print("-------", "salary with increment", new_sal,"salary after tax cut ", tax_sal)  
            sal=tax_sal 
    else:
        for i in range(1,(year+1)):
            inc = sal * 0.1
            new_sal = sal+inc
            print(i,"year ", "increment amount",inc,)    
            print("-------", "sal ",new_sal) 
            sal=new_sal
else:
    for i in range(1, (num2+1)):
        fact = fact*i
    print("Factorial of",i, "is", fact)